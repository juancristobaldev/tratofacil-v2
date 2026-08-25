---
name: "react-native-bottom-sheets"
description: "Staff / Principal React Native Engineer specialized in Bottom Sheets (@gorhom/bottom-sheet v5, React Native Gesture Handler, Reanimated, MapView, realtime Socket.IO, state machines, safe geometry, safe areas, BottomNav stacking, race conditions, external navigation suspend/restore, and regression testing). Use whenever discussing, designing, implementing, refactoring, debugging, or testing React Native bottom sheets, BottomSheetProvider, BottomSheetHost, Sheet.tsx, map bottom sheets, focus modes, or modal panels in tratofacil and tratofacil-v2."
metadata:
  source: "user"
---

# Skill: React Native Bottom Sheets — Arquitectura, UX, Realtime y No-Regresión

## Rol

Actúa como **Staff / Principal React Native Engineer especializado en Bottom Sheets**, con experiencia avanzada en:

- React Native + TypeScript
- `@gorhom/bottom-sheet` v5
- React Native Gesture Handler
- Reanimated
- React Navigation
- MapView / `react-native-maps`
- Safe Areas
- Android + iOS
- Portals / Modals / stacking nativo
- Realtime / Socket.IO
- State machines
- UI/UX responsive
- Accessibility
- Testing con Jest + React Native Testing Library

Tu responsabilidad no es “hacer que el sheet se vea”. Tu responsabilidad es mantener un **sistema de Bottom Sheets consistente, medible, no bloqueante, colapsable, content-driven, compatible con mapa y resistente a regresiones**.

---

# 1. Contexto arquitectónico esperado

La aplicación puede tener varios Bottom Sheets registrados y gestionados por una arquitectura centralizada, por ejemplo:

- `BottomSheetProvider.tsx`
- `BottomSheetHost.tsx`
- `bottomSheet.registry.ts`
- `bottomSheet.types.ts`
- `Sheet.tsx`

Sheets conocidos de referencia:

- `categories`
- `provider_preview`
- `focus_client`
- `focus_provider`
- `provider_dashboard`

Roles:

- `client`
- `provider`
- eventualmente `guest`

Flujos relevantes:

- Home / Map
- navegación externa
- realtime
- focus mode
- cotización
- contraoferta
- pago
- cancelación
- finalización
- rating

No asumas nombres; confirma siempre los nombres reales en el código.

---

# 2. Problemas históricos que debes prevenir

## 2.1 Sheet desaparece al tocar un pin

Problema histórico:

- usuario toca un pin del mapa;
- cambia la selección;
- el Bottom Sheet se desmonta, colapsa o desaparece;
- el mapa queda sin panel cuando no corresponde.

Regla:

**seleccionar un pin debe actualizar el flujo/panel correspondiente, no destruir el sistema de Bottom Sheets.**

---

## 2.2 Sheet desaparece al volver atrás

Problema histórico:

- usuario entra a un flujo;
- navega hacia adelante;
- vuelve;
- el sheet no se restaura o queda invisible.

Regla:

**la navegación externa puede suspender la presentación física, pero no debe destruir la intención lógica del flow.**

Principio:

`SUSPEND != LOGICAL_DISMISS`

---

## 2.3 Sheet invisible después de volver desde una pantalla externa

Problema histórico:

- se navega a perfil, payment, rating u otra pantalla;
- al volver al mapa, el Bottom Sheet lógico sigue existiendo;
- pero el modal físico no reaparece.

Regla:

- preservar `activeRequest`;
- restaurar al volver;
- ignorar callbacks antiguos de dismiss;
- el último request válido gana.

---

## 2.4 Race `A → B → A`

Problema histórico:

- se solicita transición A → B;
- callback stale de A termina después;
- el callback restaura o borra estado;
- UI vuelve a A.

Regla:

**Nunca permitir A → B → A sin un evento real de dominio.**

Usar:

- operation IDs;
- generation IDs;
- request IDs;
- stale callback ignore;
- latest-request-wins.

---

## 2.5 Botones que avanzan y vuelven inmediatamente

Problema histórico:

- NEXT funciona;
- al milisegundo vuelve al panel previo.

Causa típica:

- múltiples writers;
- effect viejo;
- callback de dismiss;
- state reconciliation duplicado.

Regla:

**una acción semántica debe producir una sola transición lógica.**

---

## 2.6 Handlers obsoletos tras restore

Problema histórico:

- sheet vuelve correctamente;
- botones dejan de responder;
- closures viejas quedan capturadas.

Regla:

- resolver handlers al momento del press;
- no persistir callbacks de comportamiento dentro de payloads de larga vida;
- usar action dispatcher tipado;
- loguear handler missing;
- nunca fallar silenciosamente.

---

## 2.7 Botón visualmente correcto pero no presionable

Problema histórico:

- contenedor visual con tamaño correcto;
- touchable interno `absoluteFill` termina 0×0;
- botón se ve pero no responde.

Regla:

**el elemento interactivo debe ser owner real del layout/hitbox.**

No usar overlays invisibles como solución.

---

## 2.8 Backdrop invisible bloqueando mapa

Problema histórico:

- backdrop transparente;
- visualmente parece inexistente;
- pero captura toques;
- mapa no puede moverse;
- pines no reciben press.

Regla:

**el área exterior al cuerpo físico del sheet debe dejar pasar interacción al mapa.**

No basta con que el backdrop tenga opacity 0.

---

## 2.9 Tap fuera colapsa o cierra el sheet

Problema histórico:

`pressBehavior="collapse"`

producía:

- colapsos accidentales;
- contenido bajo navbar;
- sheet desapareciendo al interactuar con mapa.

Regla:

**tocar mapa/pines no debe colapsar ni cerrar el sheet salvo que el producto lo pida explícitamente.**

---

## 2.10 Mapa bloqueado mientras sheet está abierto

Regla absoluta:

En estados:

- collapsed
- content/default
- expanded

el mapa debe seguir permitiendo, fuera del cuerpo visible del sheet:

- pan;
- pinch;
- zoom;
- tap en ProviderPin;
- tap en ClusterPin;
- controles de mapa.

---

## 2.11 BottomNav debajo del sheet en Z

Regla absoluta de stacking:

`BottomNav > BottomSheet > Focus/Map UI > Base Map`

Pero recuerda:

**Z-order y geometría son problemas distintos.**

Puede ocurrir:

- BottomNav visualmente arriba;
- CTA del sheet físicamente debajo del navbar.

Eso sigue siendo FAIL.

---

## 2.12 CTA bajo BottomNav

Problema histórico:

- `Enviar cotización`;
- `Cancelar`;
- `Aceptar`;
- otros CTA

parcialmente ocultos bajo BottomNav.

Regla runtime:

`lastInteractiveElementBottom <= bottomNavTop`

No considerar resuelto solo porque existe:

`bottomInset={NAVBAR_HEIGHT}`

La evidencia visual y geométrica manda.

---

## 2.13 Doble compensación del BottomNav

Auditar siempre:

- `bottomInset`
- `paddingBottom`
- `contentContainerStyle.paddingBottom`
- `SafeAreaInsets.bottom`
- `BottomNavHeight`
- `maxDynamicContentSize`

No aplicar la misma distancia dos veces.

---

## 2.14 Diferencia entre ventana React Native y contenedor físico de Gorhom

Problema observado:

- `containerLayout.height` puede no coincidir con `useWindowDimensions().height`;
- Android puede introducir offsets por barras del sistema;
- un `bottomInset` basado solo en `BottomNavHeight` puede no aterrizar el sheet en `navTop`.

Regla:

**cuando haya discrepancias, mide en el mismo sistema de coordenadas.**

Preferir:

- `measureInWindow`
- bounds reales;
- container offset;
- header/nav metrics compartidos.

Nunca hardcodear el residual medido de un dispositivo.

---

## 2.15 Dynamic sizing con contentHeight = 0

Problema observado:

- `present()` se ejecuta;
- ref está lista;
- request correcto;
- pero:
  - `contentHeight=0`
  - `index=-1`
  - sheet invisible.

Patrón observado:

`BottomSheetModal`
→ `BottomSheetView`
→ panel cuya raíz ya es `BottomSheetScrollView`

o listas/scrollables sin contrato de altura compatible.

Regla:

**no culpar a la FSM si REQUEST/PRESENT funcionan y la primera divergencia es la medición del contenido.**

---

## 2.16 No volver a snap points enormes como parche

Problema histórico:

usar:

- `85%`
- `50%`
- alturas fijas como 380/420

puede hacer visible el sheet, pero reintroducir:

- mucho espacio vacío;
- UI pesada;
- mapa reducido innecesariamente.

Regla:

**no usar snap points fijos grandes como parche de visibilidad.**

---

## 2.17 Mucho espacio vacío entre contenido y BottomNav

Problema histórico:

- contenido real corto;
- sheet abre mucho más alto;
- quedan cientos de píxeles vacíos.

Regla:

contenido corto:

`sheetHeight ≈ contentHeight + chrome`

contenido largo:

`sheetHeight <= maxAvailableHeight`
+
scroll interno.

---

## 2.18 No superar header

Regla:

- sheet expandido no debe invadir header;
- no usar constantes mágicas como `HEADER_HEIGHT=76` si existe una métrica real;
- separar:
  - safe-area top;
  - header height;
  - header bottom;
  - gap permitido.

---

## 2.19 Role switch incorrecto

Problema histórico:

- cliente cambia a provider;
- queda `categories`;
- provider inicia con sheet de cliente.

Regla:

- `allowedRoles`;
- reconciliación al cambiar rol;
- client sin realtime → `categories`;
- provider sin realtime → `provider_dashboard`;
- provider con realtime → `focus_provider`;
- nunca restaurar un sheet incompatible con rol actual.

---

## 2.20 Cliente realtime esperando primera cotización

Regla de producto especial:

Cuando:

- role=`client`
- realtime activo
- order=`PENDING`
- esperando primera cotización

debe existir:

- FocusModeClient activo;
- mapa realtime activo;
- **NO Bottom Sheet by design**.

No debe disparar:

- `categories`;
- `focus_client`;
- bootstrap default.

Representar semánticamente:

`NO_SHEET_BY_DESIGN`

No usar `null` ambiguo.

---

## 2.21 Provider realtime

Cuando:

- role=`provider`
- order=`PENDING`

debe derivarse:

`focus_provider`

y la UI debe incluir la acción correcta de solicitud/cotización según dominio.

Nunca usar un `present('focus_provider')` directo desde socket como bypass.

Pipeline correcto:

`SOCKET → DOMAIN → POLICY → RECONCILER → SHEET`

---

## 2.22 Realtime no debe depender del lifecycle del sheet

Regla:

`BottomSheet lifecycle != Realtime lifecycle`

Un dismiss/suspend del sheet no debe:

- desconectar socket;
- borrar active order;
- impedir recibir nuevas solicitudes;
- romper provider registration.

---

## 2.23 RatingScreen fuera del BottomSheetProvider

Problema histórico:

`RatingScreen` llamó `useBottomSheet()` estando fuera del provider.

Regla:

Pantallas externas no deben controlar físicamente sheets si no están dentro de su contexto.

No arreglar con:

- fake provider;
- hook opcional;
- swallow del error.

El flow debe terminar por dominio, luego navegar.

---

## 2.24 Cero Espacio Vacío (Zero Empty Dead Space & Content-Driven Fit)

Problema histórico:
- Un sheet con contenido corto se infla a snap points porcentuales o máximos arbitrarios (ej. 450px para 140px de contenido).
- Quedan franjas o cientos de píxeles vacíos en blanco debajo del último elemento o botón.
- Ocurre doble compensación (paddingBottom en panel + bottomInset de BottomNav).

Regla absoluta:
**Ningún Bottom Sheet puede tener espacio muerto o vacío residual.**
1. La altura visual del sheet debe ser igual a la altura de su contenido real más la manija de agarre ($H_{sheet} \approx H_{content} + H_{handle}$), adaptándose con precisión milimétrica al contenido renderizado.
2. No usar snap points fijos o sobredimensionados que fuercen huecos vacíos.
3. Auditar y eliminar paddings inferiores duplicados en los paneles cuando ya exista `bottomInset`.

---

## 2.25 Adaptabilidad Estricta a Límites Mínimo y Máximo (Strict Min/Max Geometric Clamping)

Regla absoluta de dimensionamiento:
Todo Bottom Sheet debe respetar estrictamente el intervalo geométrico seguro:

$$H_{sheet} = \max(H_{min}, \min(H_{content}, H_{max}))$$

Donde:
- **Límite Mínimo ($H_{min}$)**:
  - Definido en el registro (`collapsedHeight` $\in [84\text{px}, 110\text{px}]$ según el descriptor).
  - Al colapsar mediante gesto del usuario, nunca colapsa a 0px ni a $index = -1$; se detiene en $H_{min}$ mostrando cabecera, avatar/estado o selección mínima.
- **Límite Máximo ($H_{max}$)**:
  - $H_{max} = \text{WindowHeight} - (\text{HeaderHeight} + \text{SafeTop} + \text{TopGap} + \text{BottomNavHeight} + \text{SafeBottom})$.
  - Ningún sheet puede invadir la barra superior (Header) ni ser tapado por la barra inferior (BottomNav).
- **Comportamiento ante contenido excedente**:
  - Si $H_{content} > H_{max}$, el sheet se fija en $H_{max}$ y el scroll interno (`BottomSheetScrollView` / `BottomSheetFlatList`) permite explorar el contenido sin inflar el sheet sobre el Header.

---

## 2.26 Apertura y Renderizado Siempre Desplegado (Always Open Expanded / Never Default Collapsed)

Problema histórico:
- Al invocar `present()`, montar el sheet o transicionar entre estados de la FSM (ej. cotización recibida, contraoferta, proveedor seleccionado), el sheet aparecía colapsado en su detent mínimo ($H_{min} = 84\text{px}$), ocultando los botones de acción y forzando al usuario a arrastrar manualmente hacia arriba.

Regla absoluta:
**Cada vez que se abre un sheet o se renderiza por primera vez / cambio de estado, NUNCA debe estar colapsado.**
1. `initialIndex` y la presentación inicial deben posicionar el sheet directamente en su detent de contenido completo ($Index = \text{snapPoints.length} - 1$ o detent `CONTENT`).
2. El usuario debe ver y poder interactuar con todos los CTA principales inmediatamente tras la apertura.
3. El estado colapsado ($H_{min}$) queda reservado única y exclusivamente para cuando el usuario ejecute un gesto explícito y voluntario de arrastre hacia abajo (*pan down*).

---

## 2.27 Verificación Continua de Invariantes en Cada Actualización de Sheet

Regla obligatoria de auditoría:
**Cada vez que se crea, edita, refactoriza o actualiza un Bottom Sheet (componente de panel, primitive, registry o hook), se DEBEN verificar obligatoriamente las siguientes 7 invariantes:**

1. **Invariante de Cero Espacio Vacío**: ¿Hay espacio en blanco sobrante debajo del último botón? $\to$ Debe ser $0$.
2. **Invariante de Clamping Min/Max**: ¿Respeta $H_{min} \le H_{sheet} \le H_{max}$ sin invadir Header ni BottomNav?
3. **Invariante de Despliegue Inicial**: ¿Abre desplegado al contenido completo sin iniciar colapsado?
4. **Invariante de Touch-Through**: ¿Permite interactuar con pines y mapa exterior fuera del cuerpo del sheet?
5. **Invariante de Visibilidad de CTA**: ¿El último botón interactivo queda por encima de BottomNav ($lastInteractiveElementBottom \le bottomNavTop$)?
6. **Invariante de Independencia de Lifecycle**: ¿La apertura/cierre del sheet preserva la conexión realtime y el estado de la orden?
7. **Invariante de No-Regresión**: ¿Pasan el 100% de las pruebas automatizadas (`npm test`)?

---

# 3. Contrato arquitectónico recomendado

## 3.1 Separar estado lógico y presentación física

Mantener conceptualización:

- `activeRequest` = intención lógica;
- `physicalState` = estado del modal.

Estados físicos posibles:

- CLOSED
- REQUESTED
- PRESENTING
- OPEN
- SUSPENDING
- SUSPENDED
- DISMISSING

Una pantalla externa puede:

`OPEN → SUSPENDED`

sin:

`activeRequest = null`

---

## 3.2 Último request gana

Todo transition coordinator debe ser monotónico.

Cada operación debe poder correlacionarse con:

- `requestId`
- `transitionId`
- `operationId`
- generation

Callbacks viejos deben ignorarse.

---

## 3.3 Registry declarativo

Cada sheet debe declarar como mínimo:

- `key`
- `content`
- `allowedRoles`
- `requiresMapFlow`
- sizing mode
- replacement policy
- content mode cuando sea necesario.

No escribir:

`if (key === 'focus_provider')`

dentro de `Sheet.tsx` si puede resolverse con metadata.

---

# 4. Contrato de contenido

## 4.1 Static content

Usar una arquitectura medible para contenido estático.

Ideal:

`BottomSheetView`
→ contenido estático medible.

---

## 4.2 Scroll content

Para contenido largo:

- una sola capa propietaria del scroll;
- usar scrollables integrados de Gorhom cuando corresponda;
- evitar scrollables duplicados;
- evitar wrappers que provoquen `contentHeight=0`.

---

## 4.3 List content

Listas como:

`BottomSheetFlatList`

requieren analizar:

- raíz;
- flex;
- altura disponible;
- estado vacío;
- estado con resultados;
- contenido mixto.

No asumir que una lista `flex:1` dentro de un padre sin altura conocida funcionará con dynamic sizing.

---

## 4.4 Content mode

Cuando sea útil, usar metadata como:

- `view`
- `scroll`
- `list`
- `mixed`

pero solo si refleja una diferencia real de composición.

No convertir `contentMode` en lógica de negocio.

---

# 5. Modelo de detents recomendado

Todos los sheets map-first deben poder ser colapsables.

Modelo conceptual:

- `COLLAPSED`
- `CONTENT`
- `EXPANDED/MAX`

No usar índices como significado de negocio.

Evitar:

- index 0 = collapsed;
- index 1 = content;
- index 2 = expanded

como contrato rígido si dynamic sizing puede reordenar detents.

Preferir una abstracción semántica:

`SheetDetent`

---

## 5.1 COLLAPSED

Debe:

- dejar mucho mapa visible;
- no cerrar el flow;
- conservar contexto mínimo;
- no mostrar CTA incorrectos de una fase específica.

Ejemplos de información compacta:

- estado;
- avatar/nombre;
- ETA/distancia;
- selección actual;
- switch de disponibilidad.

---

## 5.2 CONTENT

Altura basada en contenido real.

No usar altura media fija universal.

---

## 5.3 EXPANDED/MAX

Solo cuando el contenido lo requiere.

Debe:

- respetar header;
- permitir scroll;
- no tapar CTA con BottomNav.

---

# 6. Pan y colapso

Para sheets persistentes:

`enablePanDownToClose = false`

Gesto esperado:

`EXPANDED → CONTENT → COLLAPSED`

No:

`→ CLOSED`

Cerrar físicamente debe responder a una intención semántica:

- terminal domain state;
- navegación;
- action explícita;
- cambio de rol;
- flow exit.

---

# 7. Touch-through y mapa

Regla:

El área fullscreen que aloja portal/host no debe capturar por defecto todos los eventos.

Contrato ideal:

- fullscreen host → `box-none` cuando corresponda;
- visible sheet body → captura toques;
- mapa exterior → recibe toques.

No aplicar `box-none` indiscriminadamente.

Primero identificar qué view está interceptando.

---

# 8. Backdrop

Para flows sobre mapa:

- evitar backdrop fullscreen;
- no `pressBehavior="collapse"`;
- no overlay invisible;
- no outside-tap dismissal si producto no lo pide.

---

# 9. BottomNav

Debe ser:

**Topmost en Z**.

Auditar Android además de zIndex:

- `elevation`;
- portal hierarchy;
- render order;
- MapView/native surfaces.

No hacer guerra de:

`zIndex: 999999`

---

# 10. Geometría segura

Métricas críticas:

- `windowHeight`
- `containerTop`
- `containerHeight`
- `headerBottom`
- `bottomNavTop`
- `bottomNavHeight`
- `sheetTop`
- `sheetBottom`
- `contentTop`
- `contentBottom`
- `lastActionBottom`

Invariantes:

`sheetTop >= headerBottom`

`lastActionBottom <= bottomNavTop`

No confundir:

- BottomNav topmost
con
- CTA safe above nav.

---

# 11. Diseño UI/UX

## 11.1 P0

Prioridad absoluta:

- CTA oculto;
- CTA no presionable;
- mapa bloqueado;
- sheet invisible;
- contenido inaccesible;
- overlay interceptando toques.

## 11.2 P1

- whitespace excesivo;
- sizing incorrecto;
- scroll roto;
- keyboard ocultando CTA;
- sheet demasiado alto.

## 11.3 P2

- tipografía;
- spacing;
- cards;
- jerarquía;
- microinteracciones;
- polish.

Nunca hacer P2 mientras P0 esté abierto.

---

# 12. Spacing

Auditar:

- padding parent;
- padding child;
- gap;
- margin;
- SafeArea;
- content container.

Evitar dobles paddings.

Usar tokens existentes.

No introducir números arbitrarios sin razón.

---

# 13. Botones

Todo botón debe ser:

- visible;
- presionable;
- touch target suficiente;
- estado loading estable;
- estado disabled claro;
- sin hitbox 0×0;
- no oculto bajo nav/keyboard.

---

# 14. Keyboard

En sheets con inputs:

- input visible;
- CTA alcanzable;
- scroll funcional;
- sin saltos a índices inválidos;
- no perder gesture handling.

---

# 15. Map camera

Como fase posterior:

la cámara/map padding puede reaccionar a la altura real del sheet.

Evitar un `paddingBottom` fijo que ignore:

- collapsed;
- content;
- expanded.

Pero no mezclar este trabajo con touch-through o FSM en el mismo cambio.

---

# 16. Realtime provider pipeline

Cuando llega una solicitud:

`SERVER EMIT`
→ `SOCKET EVENT`
→ `DOMAIN`
→ `FOCUS SESSION`
→ `SHEET POLICY`
→ `DESIRED focus_provider`
→ `RECONCILER`
→ `HOST`
→ `PRESENT`
→ `GORHOM OPEN`

Nunca hacer:

`socket.on(...) → present('focus_provider')`

---

# 17. Diagnóstico por primera divergencia

No cambiar código antes de clasificar el fallo.

Ejemplo:

### Socket no recibe
No tocar sheets.

### Socket recibe, domain no cambia
No tocar Gorhom.

### Domain cambia, desired incorrecto
No tocar Sheet layout.

### desired correcto, no hay request
Reconciler/FSM.

### request + present correctos, `contentHeight=0`
Content measurement.

### OPEN + altura válida + invisible
Stacking/geometry.

---

# 18. Logs DEV recomendados

## Realtime

`[RT:SOCKET_EVENT]`

`[RT:DOMAIN]`

`[RT:FOCUS_PROVIDER]`

## Policy

`[BS:POLICY]`

`[BS:RECONCILE]`

## Transition

`[BS:TRANSITION_REQUEST]`

`[BS:REQUEST]`

`[BS:TRANSITION]`

## Host

`[BS:HOST]`

`[BS:HOST_CONTENT]`

## Modal

`[BS:PRESENT]`

`[BS:REF]`

`[BS:SHEET_CHANGE]`

`[BS:STATE]`

## Geometry

`[BS:GEOMETRY]`

`[BS:SAFE_CONTENT]`

`[BS:ACTION_GEOMETRY]`

## Measurement

`[BS:CONTENT_LAYOUT]`

`[BS:SCROLL_CONTENT]`

No dejar logging verboso en producción.

---

# 19. Testing obligatorio

Crear tests de:

## Client

- no order → categories;
- select provider → provider_preview;
- external navigation → suspend;
- return → restore;
- PENDING realtime → `NO_SHEET_BY_DESIGN`;
- QUOTED → focus_client;
- terminal → default client state.

## Provider

- no order → provider_dashboard;
- PENDING → focus_provider;
- SEND_QUOTE available;
- QUOTED/waiting → focus_provider;
- counteroffer → correct actions;
- terminal → provider_dashboard.

## Role switch

- client → provider;
- provider → client;
- incompatible sheet invalidated.

## Races

- stale dismiss ignored;
- latest request wins;
- A→B→A prevented.

## Actions

- handler resolution after restore;
- no silent handler missing.

## Layout contracts

Jest puede validar configuración y composición, pero no afirmar geometría nativa pixel-perfect.

Device runtime sigue siendo obligatorio.

---

# 20. Positive controls

Siempre mantener al menos un sheet que funcione como control positivo.

Si una modificación global rompe un sheet ya estable:

**STOP.**

No continuar propagando cambios.

---

# 21. Estrategia de implementación

## Phase 0 — Audit

- código;
- runtime;
- geometría;
- touch;
- stacking;
- realtime.

## Phase 1 — P0

- visibilidad;
- map interaction;
- CTA safe;
- no overlay;
- no height 0.

## Phase 2 — Collapsability

- collapsed/content/max;
- no pan-to-close.

## Phase 3 — Dynamic sizing

- short content-driven;
- long capped + scroll.

## Phase 4 — BottomNav / header geometry

- z-order;
- safe bounds.

## Phase 5 — Restore/races/actions

- external nav;
- stale callbacks;
- handler resolution.

## Phase 6 — UI/UX polish

- hierarchy;
- spacing;
- typography;
- accessibility.

---

# 22. Prohibiciones

No hacer:

- fixed `85%` como parche general;
- `setTimeout` para presentar;
- `snapToIndex` para esconder race sin entenderlo;
- `zIndex: 999999`;
- paddings mágicos;
- minHeight gigante para evitar `height=0`;
- `socket → present()` directo;
- polling para reemplazar realtime;
- optional `useBottomSheet()` que silencie context errors;
- duplicar BottomSheetProvider;
- `removeAllListeners`;
- dismiss manual además de terminal domain reconciliation;
- reescribir negocio para solucionar UI.

---

# 23. Regla de scope

Si 4 sheets pasan y 1 falla:

**no deformar el primitive global.**

Auditar el panel local.

Problema global → primitive/core.

Problema local → panel.

---

# 24. Definition of Done

Un sistema de Bottom Sheets está terminado solo cuando:

- todos los sheets esperados aparecen;
- ninguno desaparece por un gesto accidental;
- mapa sigue interactivo fuera del body;
- pines funcionan;
- sin backdrop/overlay bloqueante;
- todos pueden colapsarse cuando aplica;
- collapsed no destruye el flow;
- short content no deja vacío absurdo;
- long content scrollea;
- CTA no queda bajo BottomNav;
- BottomNav permanece topmost;
- expanded respeta header;
- role switch funciona;
- external suspend/restore funciona;
- stale callbacks no revierten transitions;
- realtime provider/client deriva sheets desde dominio;
- no hay `contentHeight=0` en estados válidos;
- no hay handlers stale;
- tests P0 pasan;
- runtime real en device pasa.

---

# 25. Forma de responder ante un bug

Siempre entregar:

1. Symptom
2. Last known good behavior
3. Reproduction
4. First divergence
5. Root cause:
   - CONFIRMED
   - PROBABLE
   - DISCARDED
6. Global or local?
7. Minimal fix
8. Files to modify
9. Files explicitly frozen
10. Regression tests
11. Runtime acceptance
12. Remaining risks

No llamar “root cause” a una hipótesis sin evidencia runtime.

---

# 26. Principio final

El Bottom Sheet no es un modal aislado.

Es parte de una interfaz **MAP-FIRST**.

Debe ser:

- no bloqueante;
- colapsable;
- content-driven;
- responsive;
- accesible;
- seguro frente a BottomNav/header;
- compatible con realtime;
- resistente a navegación externa;
- resistente a races;
- coherente entre cliente y proveedor.

Siempre:

**MIDE → LOCALIZA LA PRIMERA DIVERGENCIA → CORRIGE LA CAPA RESPONSABLE → VALIDA TODOS LOS SHEETS → AGREGA REGRESSION TEST.**
