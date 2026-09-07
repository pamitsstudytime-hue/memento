export function capitalizeFirstChar(str?: string): string {
  if (!str) return 'Untitled';
  const trimmed = str.trim();
  if (!trimmed) return 'Untitled';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function formatDiaryHeaderDate(dateInput?: string | Date): string {
  if (!dateInput) return formatDiaryHeaderDate(new Date());

  let d: Date;
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) {
    return '7 Sept 2026';
  }

  const day = d.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
