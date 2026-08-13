// jsdomの window.location は差し替えられず、テストから reload をモックできない。
// 副作用をこの薄いラッパーに閉じ込めることで、呼び出し側をテスト可能にしている。
export function reloadPage() {
  window.location.reload();
}
