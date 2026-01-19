import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createToken,
  setAuthCookie,
  clearAuthCookie,
} from "@/lib/auth";

/**
 * POST /api/auth - 로그인
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 입력값 검증
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "아이디와 비밀번호를 입력해주세요.",
          },
        },
        { status: 400 }
      );
    }

    // 자격 증명 검증
    const isValid = verifyCredentials(username, password);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_ERROR",
            message: "아이디 또는 비밀번호가 올바르지 않습니다.",
          },
        },
        { status: 401 }
      );
    }

    // JWT 토큰 생성 및 쿠키 설정
    const token = await createToken(username);
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "로그인에 성공했습니다.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth - 로그아웃
 */
export async function DELETE() {
  try {
    await clearAuthCookie();

    return NextResponse.json({
      success: true,
      message: "로그아웃되었습니다.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
