const car = document.getElementById("car");
const engine = document.getElementById("engine");

const lanes = ["20%", "50%", "80%"];
let lane = 1;

let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  engine.play();
});

document.addEventListener("touchend", e => {
  let endX = e.changedTouches[0].clientX;

  if (endX - startX > 40 && lane < 2) lane++;
  if (startX - endX > 40 && lane > 0) lane--;

  car.style.left = lanes[lane];
});
