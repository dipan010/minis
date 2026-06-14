import { NextRequest, NextResponse } from "next/server";
import type { ScoreRequestBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body: ScoreRequestBody = await request.json();

  // Placeholder — scoring logic to be implemented
  void body;

  return NextResponse.json({ message: "Not yet implemented" }, { status: 501 });
}
