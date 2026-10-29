import { handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import {
  clearSessionCookie,
  readSessionToken,
  revokeSessionByToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const token = await readSessionToken();
    if (token) {
      await revokeSessionByToken(token);
    }

    const response = jsonOk({ loggedOut: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
