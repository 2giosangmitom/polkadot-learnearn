import { gradeAnswer } from "@/lib/ai/grader"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const result = await gradeAnswer(body.milestone, body.answer)

  return NextResponse.json(result)
}
