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
    d = new Date();
  }

  // Prevent JavaScript missing-year bug where dates like "Sep 4" default to 2001
  if (d.getFullYear() === 2001) {
    d.setFullYear(new Date().getFullYear());
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

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseNoteDateToISO(dateInput?: string): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  if (!dateInput || !dateInput.trim()) {
    return formatDateToISO(now);
  }
  let dateStr = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    if (dateStr.startsWith('2001-')) {
      return `${currentYear}${dateStr.slice(4)}`;
    }
    return dateStr;
  }
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return formatDateToISO(now);
  }
  if (parsed.getFullYear() === 2001) {
    parsed.setFullYear(currentYear);
  }
  return formatDateToISO(parsed);
}

export function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

