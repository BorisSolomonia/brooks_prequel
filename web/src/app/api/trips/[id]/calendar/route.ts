import { getAccessToken } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  '';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { accessToken } = await getAccessToken();
    const incomingUrl = new URL(request.url);
    const acknowledgedLateItemIds = incomingUrl.searchParams.getAll('acknowledgedLateItemIds');
    const query = new URLSearchParams();
    acknowledgedLateItemIds.forEach((id) => query.append('acknowledgedLateItemIds', id));
    const queryString = query.toString();
    const response = await fetch(`${API_BASE_URL}/api/me/trips/${params.id}/calendar.ics${queryString ? `?${queryString}` : ''}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const contentType = response.headers.get('Content-Type') ?? '';

      if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
        const error = await response.json().catch(() => ({ detail: 'Failed to generate calendar file' }));
        return NextResponse.json(
          { detail: error.detail || error.message || 'Failed to generate calendar file' },
          { status: response.status }
        );
      }

      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        { detail: errorText || 'Failed to generate calendar file' },
        { status: response.status }
      );
    }

    const body = await response.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': response.headers.get('Content-Disposition') ?? `attachment; filename="brooks-trip-${params.id}.ics"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}
