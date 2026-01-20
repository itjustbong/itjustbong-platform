import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/posts";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      { error: { message: "카테고리를 불러오는데 실패했습니다." } },
      { status: 500 }
    );
  }
}
