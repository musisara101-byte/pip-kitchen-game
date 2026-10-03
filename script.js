

(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const loading = document.getElementById('loading');

  const W = 1360;
  const H = 850;

  const ASSETS = {
    kitchen: './kitchen-bg.png',
    cat: './cat-sheet.png',
    food: './food-sheet.png',
    kitchenAssets: './kitchen-assets.png'
  };

  const images = {};

  const state = {
    ready: false,
    dragging: null,
    pointerId: null,

    cat: {
      x: 1060,
      y: 435,
      w: 220,
      h: 255,
      reaction: 'neutral'
    },

    foods: [
      {
        id: 'tomato',
        x: 250,
        y: 650,
        w: 90,
        h: 90,
        sx: 0,
        sy: 0,
        sw: 240,
        sh: 220
      },

      {
        id: 'banana',
        x: 380,
        y: 650,
        w: 120,
        h: 85,
        sx: 540,
        sy: 0,
        sw: 330,
        sh: 220
      },

      {
        id: 'strawberry',
        x: 520,
        y: 650,
        w: 85,
        h: 90,
        sx: 950,
        sy: 0,
        sw: 230,
        sh: 220
      },

      {
        id: 'fish',
        x: 640,
        y: 650,
        w: 115,
        h: 80,
        sx: 0,
        sy: 210,
        sw: 300,
        sh: 220
      }
    ]
  };

  function loadImage(name, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        images[name] = img;
        resolve(img);
      };

      img.onerror = () => {
        console.error(`فشل تحميل الصورة: ${src}`);
        reject(new Error(`Could not load ${src}`));
      };

      img.src = src;
    });
  }

  async function loadAssets() {
    try {
      await Promise.all(
        Object.entries(ASSETS).map(([name, src]) =>
          loadImage(name, src)
        )
      );

      state.ready = true;
      loading.classList.add('hidden');

      resize();
      requestAnimationFrame(loop);

    } catch (error) {
      console.error(error);
      loading.textContent = 'فيه ملف صورة ما انقرأ — افتحي Console';
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(
      canvas.width / W,
      0,
      0,
      canvas.height / H,
      0,
      0
    );
  }

  function drawKitchen() {
    ctx.drawImage(
      images.kitchen,
      0,
      0,
      W,
      H
    );
  }

  function getCatFrame() {
    /*
      cat-sheet تقريباً:
      4 شخصيات بالأعلى
      4 بالأسفل

      نغير الإطار حسب ردة الفعل.
    */

    const frames = {
      neutral:    { col: 0, row: 0 },
      happy:      { col: 1, row: 0 },
      surprised:  { col: 2, row: 0 },
      disgusted:  { col: 3, row: 0 },
      spicy:      { col: 0, row: 1 },
      sleepy:     { col: 1, row: 1 },
      eating:     { col: 2, row: 1 },
      chewing:    { col: 3, row: 1 }
    };

    return frames[state.cat.reaction] || frames.neutral;
  }

  function drawCat() {
    const img = images.cat;
    const frame = getCatFrame();

    const cellW = img.width / 4;
    const cellH = img.height / 2;

    const sx = frame.col * cellW;
    const sy = frame.row * cellH;

    ctx.drawImage(
      img,
      sx,
      sy,
      cellW,
      cellH,
      state.cat.x - state.cat.w / 2,
      state.cat.y - state.cat.h / 2,
      state.cat.w,
      state.cat.h
    );
  }

  function drawFood(item) {
    const img = images.food;

    ctx.drawImage(
      img,

      item.sx,
      item.sy,
      item.sw,
      item.sh,

      item.x - item.w / 2,
      item.y - item.h / 2,
      item.w,
      item.h
    );
  }

  function drawFoods() {
    state.foods.forEach(drawFood);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    drawKitchen();
    drawFoods();
    drawCat();
  }

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * W / rect.width,
      y: (event.clientY - rect.top) * H / rect.height
    };
  }

  function hitFood(point) {
    for (let i = state.foods.length - 1; i >= 0; i--) {
      const f = state.foods[i];

      if (
        point.x >= f.x - f.w / 2 &&
        point.x <= f.x + f.w / 2 &&
        point.y >= f.y - f.h / 2 &&
        point.y <= f.y + f.h / 2
      ) {
        return f;
      }
    }

    return null;
  }

  function pointerDown(event) {
    event.preventDefault();

    const point = getPoint(event);
    const food = hitFood(point);

    if (!food) return;

    state.dragging = {
      food,
      offsetX: food.x - point.x,
      offsetY: food.y - point.y
    };

    state.pointerId = event.pointerId;

    canvas.setPointerCapture(event.pointerId);

    /*
      نخلي العنصر المسحوب آخر عنصر عشان ينرسم فوق.
    */
    state.foods = state.foods.filter(x => x !== food);
    state.foods.push(food);
  }

  function pointerMove(event) {
    if (!state.dragging) return;

    event.preventDefault();

    const point = getPoint(event);

    const food = state.dragging.food;

    food.x = point.x + state.dragging.offsetX;
    food.y = point.y + state.dragging.offsetY;

    food.x = Math.max(
      food.w / 2,
      Math.min(W - food.w / 2, food.x)
    );

    food.y = Math.max(
      food.h / 2,
      Math.min(H - food.h / 2, food.y)
    );

    /*
      إذا قرب الأكل من القط، يتفاجأ.
    */
    const distance = Math.hypot(
      food.x - state.cat.x,
      food.y - state.cat.y
    );

    if (distance < 180) {
      state.cat.reaction = 'surprised';
    } else {
      state.cat.reaction = 'neutral';
    }
  }

  function pointerUp(event) {
    if (!state.dragging) return;

    event.preventDefault();

    const food = state.dragging.food;

    const mouthX = state.cat.x;
    const mouthY = state.cat.y + 10;

    const distance = Math.hypot(
      food.x - mouthX,
      food.y - mouthY
    );

    if (distance < 100) {

      state.cat.reaction = 'eating';

      state.foods = state.foods.filter(
        item => item !== food
      );

      setTimeout(() => {
        state.cat.reaction = 'chewing';
      }, 350);

      setTimeout(() => {
        state.cat.reaction =
          food.id === 'fish'
            ? 'happy'
            : 'happy';
      }, 900);

      setTimeout(() => {
        state.cat.reaction = 'neutral';
      }, 2200);
    }

    state.dragging = null;
    state.pointerId = null;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
  }

  function loop() {
    if (!state.ready) return;

    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener(
    'pointerdown',
    pointerDown
  );

  canvas.addEventListener(
    'pointermove',
    pointerMove
  );

  canvas.addEventListener(
    'pointerup',
    pointerUp
  );

  canvas.addEventListener(
    'pointercancel',
    pointerUp
  );

  canvas.addEventListener(
    'contextmenu',
    event => event.preventDefault()
  );

  window.addEventListener(
    'resize',
    resize
  );

  loadAssets();

})();