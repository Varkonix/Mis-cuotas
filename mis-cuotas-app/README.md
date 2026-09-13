# Mis Cuotas

App personal para llevar el control de pagos en cuotas y gastos fijos mensuales.

## Funcionalidad

- Cada producto en cuotas se etiqueta como `F4`, `F3`, `F2`, `F1`, `Último pago` y luego desaparece automáticamente del mes siguiente.
- Los gastos fijos (sin fecha de término) se muestran todos los meses con la etiqueta `Fijo`.
- Navegación mes a mes, marcar pagos individuales o todo el mes de una vez.
- Eliminar un ítem solo del mes actual (los meses futuros lo siguen mostrando normalmente) o eliminarlo por completo.
- Guardado automático de los datos (ver sección de almacenamiento más abajo).

## Stack

- React 18 + Vite
- Tailwind CSS
- lucide-react (iconos)

## Cómo correr en local

```bash
npm install
npm run dev
```

Luego abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## Nota sobre el almacenamiento

Este componente fue creado originalmente como un Artifact de Claude, que ofrece una API propia `window.storage` para persistir datos. Para que la app funcione igual fuera de Claude.ai, se agregó un pequeño adaptador (`src/App.jsx`) que usa `window.storage` si existe, y si no, cae automáticamente a `localStorage` del navegador. Esto significa que, al correr la app en tu propio navegador (local, GitHub Pages, Vercel, etc.), los datos se guardan en el `localStorage` de ese navegador/dispositivo — no se sincronizan entre dispositivos ni se respaldan en un servidor.

Si más adelante quieres persistencia real multi-dispositivo, el siguiente paso natural es conectar un backend simple (por ejemplo Supabase o una API propia) en lugar de `localStorage`.

## Origen

Prototipo generado y iterado con ayuda de Claude (Anthropic).
