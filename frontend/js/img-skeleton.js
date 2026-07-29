/**
 * 图片骨架屏 —— 只负责在图片解码完成后打上 .is-loaded。
 *
 * 占位效果本身是纯 CSS（见各页 <style> 里的 .fp-img 规则）：<img> 自己的 background
 * 会一直显示到位图画上来为止，所以不用额外包一层 DOM，首帧就有微光占位，不依赖 JS 到位。
 * 这个脚本只做两件事：
 *   1. 已在缓存里的图（img.complete）立刻标记，避免闪一下微光；
 *   2. 监听后续动态插进来的 .fp-img（分类 tab 的产品卡是 innerHTML 渲染的）。
 *
 * 用法：给内容图加 class="fp-img"，然后 <script src="js/img-skeleton.js" defer></script>。
 * logo、图标这类透明 PNG 不要加，微光底色会透出来。
 */
(function () {
  'use strict';

  function done(img) {
    img.classList.add('is-loaded');
  }

  function watch(img) {
    if (img.dataset.fpSkel) return;
    img.dataset.fpSkel = '1';
    // complete 为 true 但 naturalWidth 为 0 说明是加载失败的图，同样收起骨架，
    // 否则 alt 文字会压在一直转的微光上。
    if (img.complete) { done(img); return; }
    img.addEventListener('load', () => done(img), { once: true });
    img.addEventListener('error', () => done(img), { once: true });
  }

  // root 可能是 document(nodeType 9) 或动态插入的元素(nodeType 1)，文本节点直接跳过
  function scan(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && root.matches('img.fp-img')) watch(root);
    root.querySelectorAll('img.fp-img').forEach(watch);
  }

  scan(document);

  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach(scan);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
