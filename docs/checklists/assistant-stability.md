# Assistant Stability - 1 Minute Smoke Test

Quick checklist to verify core assistant functionality is working properly.

## Prerequisites
- Dev environment running
- Clean browser session (incognito recommended)

## Test Steps

### 1. Clean Build
```bash
rm -rf .next && npm run dev
```
✅ Build completes without errors  
✅ Dev server starts on expected port

### 2. Hard Reload
- Open browser dev tools (F12)
- Right-click reload → "Empty Cache and Hard Reload" (or Disable cache + reload)

✅ Page loads without console errors  
✅ No chunk load errors or HMR issues

### 3. Search CTA Test
- Click "Buscar planes" button
- Verify right panel opens

✅ Right panel slides in smoothly  
✅ No ping-pong logs in console  
✅ Search interface is functional

### 4. Comparison Test
- Pin 2 different plans from search results
- Verify comparator component renders

✅ Comparator table appears  
✅ No i18n translation crashes  
✅ Plan data displays correctly  
✅ Remove buttons (X) work

### 5. Proposal Generation Test
- With 2+ pinned plans, click "Generar propuesta"
- Verify loading state and completion

✅ Button shows "Generando..." with spinner  
✅ Success toast appears  
✅ PDF URL opens in new tab  
✅ No console errors during generation

## Expected Results
All ✅ items should pass. If any fail:

1. Check console for specific errors
2. Try `pnpm dev:clean` (rm -rf .next + restart)
3. Clear browser cache completely
4. Check network tab for failed requests

## Common Issues
- **ChunkLoadError**: Clean build + hard reload
- **i18n crashes**: Check translation keys in console
- **Proposal generation fails**: Check API route logs
- **Right panel not opening**: Verify state management

---
*Last updated: $(date)*
*Test duration: ~1 minute*
