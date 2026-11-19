export function parseCategoryInput(body: any): { name?: string; description?: string | null; error?: string } {
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) return { error: 'Enter a category name.' };
  if (name.length > 60) return { error: 'Use 60 characters or fewer for the name.' };
  const description = typeof body?.description === 'string' && body.description.trim() ? body.description.trim().slice(0, 300) : null;
  return { name, description };
}
