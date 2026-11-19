export async function navigate(page,name) {
  const link=page.getByRole('link',{name,exact:true});
  if(!await link.isVisible()) await page.getByRole('button',{name:'Mostrar menú',exact:true}).click();
  await link.click();
}
