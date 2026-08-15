/* ============================================================
   Gallery — shows the baked-in PHOTOS array plus anything added
   through the passcode-gated uploader (saved to this browser only,
   via localStorage).
   ============================================================ */

// Change this to something only Avi knows.
const AVI_PASSCODE = "changeme";

const Gallery = (() => {
  const STORAGE_KEY = "fa_gallery_local_photos";

  function getLocalPhotos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveLocalPhotos(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function render() {
    const grid = document.getElementById("photoGrid");
    grid.innerHTML = "";
    const all = [...PHOTOS, ...getLocalPhotos()];
    if (!all.length) {
      grid.innerHTML = `<div class="photo-empty">No photos yet. Avi can unlock the uploader above to add some.</div>`;
      return;
    }
    all.forEach((src) => {
      const div = document.createElement("div");
      div.className = "photo-thumb";
      const img = document.createElement("img");
      img.src = src;
      img.loading = "lazy";
      img.alt = "";
      div.appendChild(img);
      div.addEventListener("click", () => openLightbox(src));
      grid.appendChild(div);
    });
  }

  function openLightbox(src) {
    document.getElementById("lightboxImg").src = src;
    document.getElementById("lightbox").hidden = false;
  }

  function init() {
    const unlockBtn = document.getElementById("unlockGalleryBtn");
    const addPanel = document.getElementById("galleryAdd");
    const photoInput = document.getElementById("photoInput");

    unlockBtn.addEventListener("click", () => {
      if (!addPanel.hidden) {
        addPanel.hidden = true;
        return;
      }
      const entered = prompt("Avi's passcode:");
      if (entered === null) return;
      if (entered === AVI_PASSCODE) {
        addPanel.hidden = false;
      } else {
        alert("That's not it.");
      }
    });

    photoInput.addEventListener("change", async (e) => {
      const files = [...e.target.files];
      const current = getLocalPhotos();
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        current.push(dataUrl);
      }
      saveLocalPhotos(current);
      render();
      photoInput.value = "";
    });

    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    document.getElementById("lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });

    function closeLightbox() {
      document.getElementById("lightbox").hidden = true;
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  return { render, init };
})();

document.addEventListener("DOMContentLoaded", () => Gallery.init());
