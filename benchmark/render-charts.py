"""Render the README benchmark results as a single SVG line chart."""
from html import escape
from pathlib import Path

root = Path(__file__).resolve().parent.parent
readme = (root / 'README.md').read_text(encoding='utf-8')
section = readme.split('## 측정 결과 (', 1)[1].split('\n## ', 1)[0]
servers = ['Axum', 'Spring Boot', 'NestJS', 'FastAPI', 'Gin', 'ASP.NET Core']
tasks = ['plaintext', 'json', 'json-large', 'aggregate']
colors = ['#2563eb', '#16a34a', '#dc2626', '#0891b2', '#d97706', '#7c3aed']
data = {}
for line in section.splitlines():
    cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
    if len(cells) == 7 and cells[0] in servers and cells[1] in tasks:
        key = (cells[0], cells[1])
        if key in data:
            raise ValueError(f'duplicate benchmark result: {key}')
        data[key] = float(cells[2].replace(',', ''))
if len(data) != len(servers) * len(tasks):
    raise ValueError('README must contain exactly one result per server and endpoint')

parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="720" viewBox="0 0 1400 720">',
         '<rect width="1400" height="720" fill="#f8fafc"/>',
         '<g font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans CJK KR, sans-serif" fill="#0f172a">']
def text(x, y, value, size=16, fill='#0f172a', extra=''):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" {extra}>{escape(str(value))}</text>')

text(55, 55, '초당 성공 요청 수', 30, extra='font-weight="700"')
text(55, 85, '2026-10-23  |  목표 50,000 RPS  |  병렬도 4  |  3회 측정의 중앙값', 16, '#475569')
text(55, 112, '높을수록 좋습니다. 각 작업은 별개의 측정이며 연결선은 비교를 돕기 위한 표시입니다.', 15, '#475569')
left, right, top, bottom = 120, 1320, 180, 525
xs = [left + i * (right - left) / 3 for i in range(4)]
for level in range(0, 30001, 5000):
    y = bottom - level / 30000 * (bottom - top)
    parts.append(f'<line x1="{left}" y1="{y:.1f}" x2="{right}" y2="{y:.1f}" stroke="#dbe3ed"/>')
    text(left - 15, y + 5, f'{level:,}', 14, '#64748b', 'text-anchor="end"')
for x, task in zip(xs, tasks):
    parts.append(f'<line x1="{x:.1f}" y1="{top}" x2="{x:.1f}" y2="{bottom}" stroke="#e9eef5"/>')
    text(x, 556, task, 16, '#334155', 'text-anchor="middle" font-weight="600"')
for server, color in zip(servers, colors):
    points = [(x, bottom - data[server, task] / 30000 * (bottom - top)) for x, task in zip(xs, tasks)]
    coords = ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)
    parts.append(f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="3.5" stroke-linejoin="round"/>')
    for (x, y), task in zip(points, tasks):
        value = data[server, task]
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5.5" fill="{color}" stroke="white" stroke-width="2"><title>{escape(server)} — {task}: 초당 {value:,.1f}건</title></circle>')
for i, (server, color) in enumerate(zip(servers, colors)):
    x = 76 + i * 215
    parts.append(f'<line x1="{x}" y1="610" x2="{x + 26}" y2="610" stroke="{color}" stroke-width="4"/>')
    parts.append(f'<circle cx="{x + 13}" cy="610" r="4" fill="{color}"/>')
    text(x + 34, 615, server, 16, '#334155')
text(55, 660, 'Gin json-large: HTTP 실패율 중앙값 38.504%. 연결 거부와 타임아웃이 발생했습니다.', 14, '#9a3412')
text(55, 687, '모든 작업에서 요청이 누락됐습니다. 서버와 k6가 한 PC를 사용했으므로 최대 처리량을 의미하지 않습니다.', 14, '#475569')
parts.append('</g></svg>')
(root / 'benchmark' / 'charts.svg').write_text('\n'.join(parts) + '\n', encoding='utf-8')
