# Atlas Comercial — Dashboard de clientes con coordenadas

Dashboard estático para Excel de clientes geolocalizados. Diseñado para **Clientes con coordenadas.xlsx** (6 hojas, con columnas Cliente, Nombre, DIRECCION, Total y Coordenadas).

## Uso local (VS Code)

1. Abrí la carpeta `dashboard-puntos` en Visual Studio Code.
2. Ejecutá `index.html` con **Live Server**.
3. Pulsá **Cargar Excel** y seleccioná **Clientes con coordenadas.xlsx**.
4. Navegá por el mapa, filtrá por vendedor y compras, seleccioná establecimientos en la tabla y exportá CSV.

## GitHub Pages

Subí el contenido de esta carpeta al repositorio (con `index.html` en la raíz). En **Settings → Pages**, seleccioná **Deploy from a branch → main → /(root)**. El Excel **no debe subirse** al repositorio. Cada usuario selecciona el archivo desde su dispositivo.

## Lectura y supuestos

- El sistema examina todas las hojas y reconoce sus encabezados de forma dinámica. El vendedor se obtiene del nombre de la hoja.
- Cada código de cliente se mantiene como texto, conservando ceros iniciales si el Excel los almacena como texto. Un código duplicado se informa y solo se muestra una vez.
- Se utilizan los **totales ya presentes** en el archivo; no se calculan ventas por mes ni se suman subtotales.
- Los puntos corresponden a las **coordenadas aportadas** en el archivo, no a direcciones geocodificadas automáticamente. No se ha comprobado físicamente cada posición.
- Las ubicaciones fuera de rangos geográficos plausibles para Costa Rica se omiten del mapa y generan advertencia.
- Para evitar superposiciones, los marcadores cercanos se agrupan; se separan al acercar. Color = segmento de compra; tamaño = importe.
- Los filtros modifican indicadores, mapa, rankings, segmentos, tabla y CSV simultáneamente.

## Privacidad y dependencias

El Excel se procesa únicamente en el navegador; no se incluye en el código ni se envía a un servidor del dashboard. Los mosaicos de OpenStreetMap y bibliotecas (SheetJS, Leaflet, Leaflet.markercluster) sí se descargan de servicios externos y requieren conexión; la navegación por el mapa envía solicitudes a dichos servicios. No incluye claves privadas ni servidor. GitHub Pages es público: **no subir el Excel original, el CSV exportado ni otras bases comerciales**.

## Limitaciones

Este nuevo archivo contiene una cartera parcial frente al historial anterior: 304 clientes, no los 807 clientes históricos. Para visualizar más clientes, hay que agregarles coordenadas y montos al Excel compatible. Los importes por vendedor se atribuyen según la hoja en la que figura cada cliente.

## Solución al error 403 del mapa

Se reemplazó la dirección antigua de subdominios `{s}.tile.openstreetmap.org` por la URL canónica `tile.openstreetmap.org`, se configuró el envío de la referencia de origen y se agregó una advertencia de fallos. Los servidores comunitarios pueden continuar bloqueando aplicaciones aunque cumplan estas medidas: **esta corrección no garantiza acceso**. Abrí el sitio desde Live Server o GitHub Pages, no como archivo `file://`. Recargá con Ctrl+F5. Si el error continúa, habrá que contratar/configurar un proveedor autorizado de teselas, por ejemplo CARTO con su clave API, y reemplazar la capa base. Nunca publiques claves privadas.


## Mapa base (CARTO)

Los servidores públicos de OpenStreetMap pueden devolver 403, por lo que esta versión ya **no solicita teselas a tile.openstreetmap.org**.

1. Solicitá una clave gratuita en https://carto.com/basemaps/apikey/ .
2. Abrí el dashboard con Live Server (o GitHub Pages).
3. Pegá la clave en «Activar cartografía CARTO» y presioná «Activar mapa».
4. Si restringís la clave por dominios, permití `localhost` o `127.0.0.1` para Live Server y `jansv23.github.io` al publicarlo; CARTO puede exigir claves separadas según restricciones.

La clave queda solo en `sessionStorage` de la pestaña (hasta que se cierre) y nunca se incluye en los archivos del repositorio. Es una clave **pública de uso en el navegador**, no una clave secreta privada. CARTO puede aplicar límites de uso; mantené las atribuciones visibles. Los puntos del Excel continúan procesándose localmente.


## Corrección puntos v3
Se reemplazó MarkerCluster por marcadores circulares individuales. Los 304 puntos pueden dibujarse aun cuando un proveedor de cartografía no responda. Cargar Excel primero; luego usar Centrar mapa.

## Cambios de interfaz (v3)
- Los filtros aparecen en una franja horizontal encima del mapa.
- Se destacan solamente dos segmentos: ₡500.000–₡1.000.000 y más de ₡1.000.000. Los clientes con menos de ₡500.000 **no se eliminan**: aparecen con un marcador gris como "sin segmento" y siguen incluidos en indicadores y ventas.
- El botón **Pantalla completa** usa la API Fullscreen del navegador; también conserva el botón **Centrar mapa**. Pulsar Escape sale del modo pantalla completa.
