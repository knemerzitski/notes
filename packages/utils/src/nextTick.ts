export default function nextTick() {
  return new Promise((res) => setTimeout(res, 0));
}
