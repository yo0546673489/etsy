# Profitly Design System

## שימוש מהיר

```tsx
import { Button, Card, Badge, Input, Modal, StatCard, tw, colors } from '@/design';
```

## קונבנציות

- כל קומפוננטה תומכת ב-`className` prop ל-override
- צבעים — תמיד מ-`tokens.ts`, אף פעם hardcoded
- RTL — כל הקומפוננטות תומכות, להשתמש ב-`me-`/`ms-` במקום `ml-`/`mr-`
- Tailwind classes מוכנות — `tw.card.base`, `tw.button.primary` וכו'
- Icons — lucide-react בלבד

## איך לשנות עיצוב

1. לפתוח צ'אט Claude Code חדש
2. לתת גישה רק ל-`apps/web/design/`
3. לשנות tokens / קומפוננטות / CSS
4. השינוי ישפיע אוטומטית על כל האתר

## איך להוסיף קומפוננטה

1. ליצור קובץ ב-`components/` או `layout/`
2. להשתמש ב-`cn()` ל-className merging
3. להשתמש ב-`tw` object לקלאסים חוזרים
4. להוסיף export ל-`index.ts`
