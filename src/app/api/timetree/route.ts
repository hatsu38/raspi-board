import { loginToTimeTree } from '../../../_libs/timetree/auth';
import { fetchAllEvents } from '../../../_libs/timetree/calendar';

export async function GET() {
  const email = process.env.TIMETREE_EMAIL;
  const password = process.env.TIMETREE_PASSWORD;

  if (!email || !password) {
    return Response.json(
      { error: 'TIMETREE_EMAIL/TIMETREE_PASSWORDが設定されていません' },
      { status: 500 }
    );
  }

  try {
    const sessionId = await loginToTimeTree(email, password);
    const events = await fetchAllEvents(sessionId);
    return Response.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : '予期せぬエラーが発生しました';
    return Response.json({ error: message }, { status: 502 });
  }
}
