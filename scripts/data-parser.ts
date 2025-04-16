import fs from "fs"
import pdfParse from "pdf-parse"
import { createObjectCsvWriter } from "csv-writer"

type Group = {
  code: string
  title: string
  description?: string
}

interface CsvRow {
  "Major Group Code": string
  "Major Group Title": string
  "Major Group Description": string
  "Sub-Major Group Code": string
  "Sub-Major Group Title": string
  "Sub-Major Group Description": string
  "Minor Group Code": string
  "Minor Group Title": string
  "Minor Group Description": string
  "Unit Group Code": string
  "Unit Group Title": string
  "Unit Group Description": string
  "Occupation Code": string
  "Occupation Title": string
}

const context: {
  major?: Group
  subMajor?: Group
  minor?: Group
  unit?: Group
  occupation?: Group
} = {}

const rows: CsvRow[] = []

const writer = createObjectCsvWriter({
  path: "data/g1-data.csv",
  header: [
    { id: "Major Group Code", title: "Major Group Code" },
    { id: "Major Group Title", title: "Major Group Title" },
    { id: "Major Group Description", title: "Major Group Description" },
    { id: "Sub-Major Group Code", title: "Sub-Major Group Code" },
    { id: "Sub-Major Group Title", title: "Sub-Major Group Title" },
    { id: "Sub-Major Group Description", title: "Sub-Major Group Description" },
    { id: "Minor Group Code", title: "Minor Group Code" },
    { id: "Minor Group Title", title: "Minor Group Title" },
    { id: "Minor Group Description", title: "Minor Group Description" },
    { id: "Unit Group Code", title: "Unit Group Code" },
    { id: "Unit Group Title", title: "Unit Group Title" },
    { id: "Unit Group Description", title: "Unit Group Description" },
    { id: "Occupation Code", title: "Occupation Code" },
    { id: "Occupation Title", title: "Occupation Title" },
  ],
  append: false,
})

const isCodeBlock = (line: string) => /^\d{1,4}\s/.test(line)
const isOccupationLine = (line: string) => /\d{6}/.test(line)
const matchCodeWithTitle = (line: string): [string, string] | null => {
  const match = line.match(/^(\d{1,4})\s+(.+)/)
  return match ? [match[1], match[2].trim()] : null
}

async function parsePDF(filePath: string): Promise<void> {
  const buffer = fs.readFileSync(filePath)
  const pdf = await pdfParse(buffer)
  const lines = pdf.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  let occupationCodeCount = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (isCodeBlock(line)) {
      const match = matchCodeWithTitle(line)
      if (!match) continue

      const [code, firstTitleLine] = match
      const descriptionLines: string[] = []
      const titleLines = [firstTitleLine]
      let j = i + 1

      // title on two lines check
      while (j < lines.length && lines[j].trim() !== "" && !/^\d/.test(lines[j])) {
        const firstChar = lines[j].charAt(0)
        if (firstChar === firstChar.toLowerCase()) {
          titleLines.push(lines[j])
        } else {
          break
        }
        j++
      }

      //description
      while (j < lines.length && lines[j].trim() !== "" && !/^\d/.test(lines[j])) {
        descriptionLines.push(lines[j])
        j++
      }

      const group: Group = {
        code,
        title: titleLines.join(" "),
        description: descriptionLines.join(" "),
      }

      if (code.length === 1) context.major = group
      else if (code.length === 2) context.subMajor = group
      else if (code.length === 3) context.minor = group
      else if (code.length === 4) context.unit = group
      i = j - 1
      continue
    }

    // OCCUPATION line: may contain multiple 6-digit codes or titles spanning lines

    if (isOccupationLine(line)) {
      let occupationLine = line
      let nextIndex = i + 1

      while (
        nextIndex < lines.length &&
        !/^\d{6}/.test(lines[nextIndex]) &&
        !/^\d{1,4}\s/.test(lines[nextIndex])
      ) {
        occupationLine += " " + lines[nextIndex]
        nextIndex++
      }
      const matches = [...occupationLine.matchAll(/(\d{6})\s+([^\d]+)/g)]
      occupationCodeCount += matches.length

      for (const match of matches) {
        const code = match[1]
        const title = match[2].trim()

        rows.push({
          "Major Group Code": context.major?.code ?? "",
          "Major Group Title": context.major?.title ?? "",
          "Major Group Description": context.major?.description ?? "",
          "Sub-Major Group Code": context.subMajor?.code ?? "",
          "Sub-Major Group Title": context.subMajor?.title ?? "",
          "Sub-Major Group Description": context.subMajor?.description ?? "",
          "Minor Group Code": context.minor?.code ?? "",
          "Minor Group Title": context.minor?.title ?? "",
          "Minor Group Description": context.minor?.description ?? "",
          "Unit Group Code": context.unit?.code ?? "",
          "Unit Group Title": context.unit?.title ?? "",
          "Unit Group Description": context.unit?.description ?? "",
          "Occupation Code": code,
          "Occupation Title": title,
        })
      }
      i = nextIndex - 1
    }
  }
  await writer.writeRecords(rows)
  console.log(
    `✅ Written ${rows.length} rows to data/g1-data.csv.${occupationCodeCount} occupation codes found`
  )
}

// Example usage
parsePDF("data/data-pdfs/Grupa_Majora_1_27062024.pdf")
