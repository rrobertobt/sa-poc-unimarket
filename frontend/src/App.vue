<script setup>
import { ref, computed, onMounted } from 'vue';

// At runtime (container) this can be overridden via window.__API_URL__ (see public/config.js
// / the Dockerfile entrypoint) or, in local dev, via VITE_API_URL. If neither is set, assume the
// backend lives on the same host the page was loaded from, on port 8080 - this lets the same
// frontend image work behind any public IP/domain without baking one in at deploy time.
const DEFAULT_API_URL = `${window.location.protocol}//${window.location.hostname}:8080`;
const API_URL = window.__API_URL__ || import.meta.env.VITE_API_URL || DEFAULT_API_URL;

const VISITOR_STORAGE_KEY = 'unimarket_visitor_name';

const products = ref([]);
const health = ref(null);
const errorMessage = ref('');

const visitorName = ref(localStorage.getItem(VISITOR_STORAGE_KEY) || '');
const nameDraft = ref('');

const newProduct = ref({ name: '', price: '', description: '' });

const statusLabel = computed(() => {
  if (!health.value) return 'conectando...';
  if (health.value.status === 'ok') return `ok · ${health.value.provider}`;
  return 'sin conexion';
});

const statusIsOk = computed(() => health.value?.status === 'ok');

const cardAngles = [-2, 1.5, -1, 2, -1.5, 1];
function cardRotation(index) {
  return cardAngles[index % cardAngles.length];
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

function signIn() {
  const trimmed = nameDraft.value.trim();
  if (!trimmed) return;
  visitorName.value = trimmed;
  localStorage.setItem(VISITOR_STORAGE_KEY, trimmed);
  nameDraft.value = '';
}

function signOut() {
  visitorName.value = '';
  localStorage.removeItem(VISITOR_STORAGE_KEY);
}

async function loadHealth() {
  try {
    const res = await fetch(`${API_URL}/health`);
    health.value = await res.json();
  } catch (e) {
    health.value = { status: 'unreachable' };
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    products.value = await res.json();
  } catch (e) {
    errorMessage.value = 'No se pudo cargar el tablon de productos.';
  }
}

async function createProduct() {
  errorMessage.value = '';
  try {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newProduct.value.name,
        price: Number(newProduct.value.price),
        description: newProduct.value.description,
        createdBy: visitorName.value
      })
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || 'Error al publicar el producto');
    }
    newProduct.value = { name: '', price: '', description: '' };
    await loadProducts();
  } catch (e) {
    errorMessage.value = e.message;
  }
}

onMounted(() => {
  loadHealth();
  loadProducts();
});
</script>

<template>
  <div class="board">
    <header class="header-note">
      <span class="pin" aria-hidden="true"></span>
      <p class="eyebrow">Mercado estudiantil &middot; CUNOC USAC</p>
      <h1 class="title">UniMarket CUNOC</h1>
      <p class="status-stub" :class="{ 'status-stub--down': !statusIsOk }">
        <span class="status-dot" :class="{ 'status-dot--down': !statusIsOk }" aria-hidden="true"></span>
        {{ statusLabel }}
      </p>
    </header>

    <section v-if="!visitorName" class="gate-note">
      <span class="pin" aria-hidden="true"></span>
      <h2 class="note-title">¿Quien sos?</h2>
      <p class="note-copy">Antes de pinear algo en el tablon, decinos tu nombre.</p>
      <form class="gate-form" @submit.prevent="signIn">
        <label class="field-label" for="visitor-name">Tu nombre</label>
        <input
          id="visitor-name"
          v-model="nameDraft"
          type="text"
          placeholder="ej. Ana Lopez"
          autocomplete="name"
          required
        />
        <button type="submit" class="btn-pin">Firmar y entrar</button>
      </form>
    </section>

    <template v-else>
      <p class="signed-as">
        Firmando como <strong>{{ visitorName }}</strong>
        <button type="button" class="link-muted" @click="signOut">cambiar</button>
      </p>

      <section class="form-note">
        <h2 class="note-title">Publicar un producto</h2>
        <form class="product-form" @submit.prevent="createProduct">
          <div class="field">
            <label class="field-label" for="product-name">Que vendes</label>
            <input
              id="product-name"
              v-model="newProduct.name"
              type="text"
              placeholder="ej. Calculadora cientifica"
              required
            />
          </div>
          <div class="field field--price">
            <label class="field-label" for="product-price">Precio</label>
            <div class="price-input">
              <span aria-hidden="true">Q</span>
              <input
                id="product-price"
                v-model="newProduct.price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div class="field field--full">
            <label class="field-label" for="product-description">Detalles (opcional)</label>
            <textarea
              id="product-description"
              v-model="newProduct.description"
              placeholder="Estado, entrega, lo que un comprador deberia saber"
              rows="2"
            ></textarea>
          </div>
          <button type="submit" class="btn-pin field--full">Pinear en el tablon</button>
        </form>
        <p v-if="errorMessage" class="error-note">{{ errorMessage }}</p>
      </section>

      <section class="listing">
        <h2 class="note-title listing-title">
          Lo que hay en el tablon
          <span class="count-mono">{{ products.length }}</span>
        </h2>

        <p v-if="!products.length" class="empty-note">
          El tablon esta vacio. Se el primero en pinear algo.
        </p>

        <div v-else class="product-grid">
          <article
            v-for="(p, index) in products"
            :key="p.id"
            class="product-card"
            :style="{ '--tilt': cardRotation(index) + 'deg' }"
          >
            <span class="pin pin--small" aria-hidden="true"></span>
            <span class="price-tag">Q {{ Number(p.price).toFixed(2) }}</span>
            <h3 class="product-name">{{ p.name }}</h3>
            <p v-if="p.description" class="product-description">{{ p.description }}</p>
            <p class="product-signature">
              &mdash; firmado por {{ p.created_by }}
              <span class="product-date">{{ formatDate(p.created_at) }}</span>
            </p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.board {
  max-width: 880px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--ink);
}

.pin {
  position: absolute;
  top: -0.6rem;
  left: 50%;
  transform: translateX(-50%);
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ef8a83, var(--pin) 60%, #7c2620 100%);
  box-shadow: 0 3px 4px rgba(0, 0, 0, 0.35);
}

.pin--small {
  width: 0.75rem;
  height: 0.75rem;
  top: -0.45rem;
}

.header-note,
.gate-note,
.form-note {
  position: relative;
  background: var(--card);
  border: 1px solid var(--card-edge);
  border-radius: 3px;
  box-shadow: 0.35rem 0.5rem 0 rgba(43, 27, 12, 0.18);
  padding: 1.6rem 1.8rem;
  margin: 0 auto 2.25rem;
}

.header-note {
  max-width: 460px;
  text-align: center;
  transform: rotate(-1.2deg);
}

.gate-note {
  max-width: 380px;
  transform: rotate(-0.8deg);
}

.form-note {
  transform: rotate(0.4deg);
}

.eyebrow {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-ink);
  margin: 0 0 0.35rem;
}

.title {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  font-size: 3.2rem;
  line-height: 1;
  margin: 0 0 0.6rem;
}

.status-stub {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  color: var(--sage);
  margin: 0;
}

.status-stub--down {
  color: var(--pin);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--sage);
}

.status-dot--down {
  background: var(--pin);
}

.note-title {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  font-size: 2rem;
  margin: 0.25rem 0 0.5rem;
}

.note-copy {
  margin: 0 0 1rem;
  color: var(--muted-ink);
}

.field-label {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-ink);
  margin-bottom: 0.3rem;
}

.gate-form,
.product-form {
  display: grid;
  gap: 1rem;
}

.product-form {
  grid-template-columns: 1fr 10rem;
}

.field--full {
  grid-column: 1 / -1;
}

input,
textarea {
  width: 100%;
  border: none;
  border-bottom: 2px solid rgba(46, 33, 21, 0.25);
  background: transparent;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  padding: 0.3rem 0.1rem;
  color: var(--ink);
}

textarea {
  resize: vertical;
}

input:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 2px solid var(--pin);
  outline-offset: 3px;
}

input:focus,
textarea:focus {
  border-bottom-color: var(--pin);
}

.price-input {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: 'Space Mono', monospace;
  border-bottom: 2px solid rgba(46, 33, 21, 0.25);
}

.price-input input {
  border-bottom: none;
  font-family: 'Space Mono', monospace;
}

.btn-pin {
  justify-self: start;
  background: var(--pin);
  color: #fdf6ec;
  border: none;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.65rem 1.4rem;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 3px 0 #7c2620;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.btn-pin:hover {
  transform: translateY(1px);
  box-shadow: 0 2px 0 #7c2620;
}

.signed-as {
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted-ink);
  margin: -1rem 0 1.5rem;
}

.link-muted {
  background: none;
  border: none;
  color: var(--ink);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  margin-left: 0.5rem;
  padding: 0;
}

.error-note {
  color: var(--pin);
  font-size: 0.85rem;
  margin-top: 1rem;
}

.listing-title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  justify-content: center;
}

.count-mono {
  font-family: 'Space Mono', monospace;
  font-size: 0.9rem;
  color: var(--muted-ink);
}

.empty-note {
  text-align: center;
  font-family: 'Caveat', cursive;
  font-size: 1.5rem;
  color: var(--muted-ink);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2rem 1.5rem;
  padding-top: 0.5rem;
}

.product-card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--card-edge);
  border-radius: 3px;
  padding: 1.4rem 1.1rem 1.1rem;
  box-shadow: 0.3rem 0.4rem 0 rgba(43, 27, 12, 0.18);
  transform: rotate(var(--tilt));
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.product-card:hover {
  transform: rotate(0deg) translateY(-2px);
  box-shadow: 0.15rem 0.6rem 0.8rem rgba(43, 27, 12, 0.28);
}

.price-tag {
  position: absolute;
  top: -0.6rem;
  right: -0.5rem;
  background: var(--pin);
  color: #fdf6ec;
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  transform: rotate(4deg);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.25);
}

.product-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  margin: 0.5rem 0 0.4rem;
}

.product-description {
  font-size: 0.88rem;
  color: var(--muted-ink);
  margin: 0 0 0.9rem;
}

.product-signature {
  font-family: 'Caveat', cursive;
  font-size: 1.15rem;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-top: 1px dashed rgba(46, 33, 21, 0.25);
  padding-top: 0.4rem;
}

.product-date {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: var(--muted-ink);
}

@media (prefers-reduced-motion: reduce) {
  .product-card,
  .btn-pin {
    transition: none;
  }
}

@media (max-width: 520px) {
  .product-form {
    grid-template-columns: 1fr;
  }
  .title {
    font-size: 2.4rem;
  }
}
</style>

<style>
:root {
  --cork: #a9764f;
  --cork-deep: #8b5e3c;
  --card: #f5ecd9;
  --card-edge: #e4d3ae;
  --ink: #2e2115;
  --muted-ink: rgba(46, 33, 21, 0.62);
  --pin: #c1443d;
  --sage: #4f7a58;
}

body {
  margin: 0;
  background-color: var(--cork);
  background-image: radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.06) 0, transparent 45%),
    radial-gradient(circle at 85% 10%, rgba(0, 0, 0, 0.12) 0, transparent 40%),
    radial-gradient(circle at 60% 80%, rgba(0, 0, 0, 0.1) 0, transparent 40%),
    radial-gradient(circle at 30% 65%, rgba(255, 255, 255, 0.05) 0, transparent 35%),
    linear-gradient(180deg, var(--cork), var(--cork-deep));
  min-height: 100vh;
}
</style>
