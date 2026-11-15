<template>
  <div class="plate-wrapper" :style="{ width: numSize + 'px', height: numSize + 'px' }">
    <div v-if="steam" class="steam" aria-hidden="true">
      <i></i><i></i><i></i>
    </div>
    <div v-html="svgContent" class="svg-container"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { rng, hash } from '../../utils/formatters';

const props = defineProps({
  dish: {
    type: Object,
    required: true
  },
  uid: {
    type: String,
    default: 'p'
  },
  steam: {
    type: Boolean,
    default: false
  },
  size: {
    type: [Number, String],
    default: 150
  }
});

const numSize = computed(() => Number(props.size) || 150);

const svgContent = computed(() => {
  const d = props.dish;
  const sz = numSize.value;
  const R = rng(hash(d.id));
  const u = d.id + props.uid;
  const pos = (n, rad) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + R() * 0.6;
      const r = rad * (0.35 + R() * 0.65);
      return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r, R() * 180];
    });

  let f = '';
  if (d.p === 'bo') {
    pos(9, 40).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-13" y="-10" width="26" height="20" rx="6" fill="url(#b${u})"/><rect x="-9" y="-7" width="13" height="5" rx="2.5" fill="#B4664A" opacity=".7"/><path d="M-8 4h14" stroke="#4A1F12" stroke-width="1.6" opacity=".5"/></g>`;
    });
    pos(10, 46).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="3.2" fill="#6A9A3E"/><circle cx="${x + 4}" cy="${y + 2}" r="2.6" fill="#7DAE4C"/>`;
    });
    if (d.id !== 'bo-lalot') {
      pos(4, 44).forEach(([x, y, a]) => {
        f += `<path d="M${x - 9} ${y} a9 6 ${a} 0 1 18 0" fill="none" stroke="#E9D3EC" stroke-width="3.2"/>`;
      });
    }
  }

  if (d.p === 'ga') {
    pos(7, 38).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="17" ry="12" fill="url(#c${u})"/><ellipse cx="-3" cy="-3" rx="9" ry="5" fill="#F2C06A" opacity=".75"/><path d="M-9 4l14-6M-6 8l14-6" stroke="#7A3D14" stroke-width="1.8" opacity=".55"/></g>`;
    });
    pos(9, 46).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="#B9CC7A" stroke-width="2"/>`;
    });
  }

  if (d.p === 'heo') {
    pos(6, 36).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-17" y="-9" width="34" height="18" rx="4" fill="#F3DCC4"/><rect x="-17" y="-2" width="34" height="6" fill="#C46A45"/><rect x="-17" y="-9" width="34" height="4" rx="2" fill="#8A4321"/></g>`;
    });
    pos(8, 46).forEach(([x, y, a]) => {
      f += `<rect x="${x}" y="${y}" width="12" height="2.4" rx="1.2" fill="#E5C25E" transform="rotate(${a} ${x} ${y})"/>`;
    });
  }

  if (d.p === 'suon') {
    pos(7, 36).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-13" y="-8" width="26" height="16" rx="7" fill="url(#s${u})"/><circle cx="14" cy="0" r="4.2" fill="#F2E6CF"/></g>`;
    });
    pos(10, 44).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="2.6" fill="#F3E7C2"/>`;
    });
  }

  if (d.p === 'trung') {
    f += `<circle cx="100" cy="100" r="54" fill="#F2C94C"/><circle cx="96" cy="95" r="40" fill="#F6D86E" opacity=".7"/>`;
    pos(5, 30).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="11" ry="7" fill="#7B4B2A"/><ellipse rx="6" ry="3" fill="#A87050"/></g>`;
    });
    pos(12, 44).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="2.8" fill="none" stroke="#4F9A4A" stroke-width="1.8"/>`;
    });
  }

  if (d.p === 'canh') {
    f += `<circle cx="100" cy="100" r="54" fill="#E2EFE0" stroke="#B8D8B2" stroke-width="2.5"/><circle cx="100" cy="100" r="48" fill="#F4E9C8" opacity=".88"/>`;
    if (d.id === 'canh-bido-thitbam') {
      pos(6, 32).forEach(([x, y, a]) => {
        f += `<rect x="${x - 10}" y="${y - 8}" width="20" height="16" rx="4" fill="#E67E22" transform="rotate(${a} ${x} ${y})"/><circle cx="${x + 2}" cy="${y - 1}" r="3" fill="#F39C12"/>`;
      });
      pos(8, 38).forEach(([x, y]) => {
        f += `<circle cx="${x}" cy="${y}" r="3.8" fill="#FDFEFE" stroke="#D5D8DC" stroke-width="1.2"/>`;
      });
    } else {
      pos(5, 30).forEach(([x, y, a]) => {
        f += `<ellipse cx="${x}" cy="${y}" rx="12" ry="8" fill="#F5CBA7" transform="rotate(${a} ${x} ${y})"/>`;
      });
      pos(8, 38).forEach(([x, y, a]) => {
        f += `<ellipse cx="${x}" cy="${y}" rx="10" ry="4.5" fill="#27AE60" transform="rotate(${a} ${x} ${y})"/>`;
      });
    }
    pos(12, 44).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="2.2" fill="#2ECC71"/>`;
    });
  }

  if (d.p === 'rau') {
    pos(6, 38).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-14 0 C-10 -14 10 -14 14 0 C10 14 -10 14 -14 0" fill="#2E7D32"/><path d="M-6 0 C-4 -6 4 -6 6 0 C4 6 -4 6 -6 0" fill="#E8F8F5" opacity=".8"/></g>`;
    });
    pos(5, 32).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="13" ry="8" fill="#5D4037"/><ellipse rx="8" ry="4" fill="#8D6E63" opacity=".8"/></g>`;
    });
    pos(8, 44).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="2" fill="#F9E79F"/>`;
    });
  }

  if (d.p === 'chay') {
    pos(5, 30).forEach(([x, y, a]) => {
      f += `<rect x="${x - 11}" y="${y - 11}" width="22" height="22" rx="4" fill="#F9E79F" stroke="#D4AC0D" stroke-width="1.5" transform="rotate(${a} ${x} ${y})"/>`;
    });
    pos(5, 38).forEach(([x, y, a]) => {
      f += `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="15" ry="9" fill="#EDBB99"/><ellipse rx="9" ry="5" fill="#D35400" opacity=".6"/></g>`;
    });
    pos(8, 42).forEach(([x, y]) => {
      f += `<circle cx="${x}" cy="${y}" r="3" fill="#1E8449"/><circle cx="${x + 3}" cy="${y + 2}" r="2.4" fill="#27AE60"/>`;
    });
  }

  pos(5, 52).forEach(([x, y, a]) => {
    f += `<ellipse cx="${x}" cy="${y}" rx="8" ry="3.6" fill="#3F8F4F" transform="rotate(${a} ${x} ${y})"/>`;
  });

  if (d.spicy) {
    pos(5, 48).forEach(([x, y, a]) => {
      f += `<rect x="${x}" y="${y}" width="9" height="3" rx="1.5" fill="#D3352B" transform="rotate(${a} ${x} ${y})"/>`;
    });
  }

  return `<svg viewBox="0 0 200 200" width="${sz}" height="${sz}" style="width:${sz}px;height:${sz}px;flex-shrink:0;display:block;" role="img" aria-label="Minh họa món ${d.name}">
    <defs>
      <radialGradient id="p${u}" cx="45%" cy="40%" r="65%">
        <stop offset="0" stop-color="#FFFFFF"/>
        <stop offset=".78" stop-color="#F5F1E8"/>
        <stop offset="1" stop-color="#E4DCCB"/>
      </radialGradient>
      <linearGradient id="b${u}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8E4430"/>
        <stop offset="1" stop-color="#5E2717"/>
      </linearGradient>
      <linearGradient id="c${u}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#E3A24B"/>
        <stop offset="1" stop-color="#B9661F"/>
      </linearGradient>
      <linearGradient id="s${u}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#9A4A22"/>
        <stop offset="1" stop-color="#6B2E14"/>
      </linearGradient>
    </defs>
    <ellipse cx="104" cy="110" rx="86" ry="84" fill="rgba(90,60,20,.16)"/>
    <circle cx="100" cy="100" r="86" fill="url(#p${u})"/>
    <circle cx="100" cy="100" r="66" fill="none" stroke="#E8E0CF" stroke-width="1.5"/>
    ${f}
  </svg>`;
});
</script>

<style scoped>
.plate-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.svg-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.svg-container :deep(svg) {
  display: block;
  flex-shrink: 0;
}
</style>
