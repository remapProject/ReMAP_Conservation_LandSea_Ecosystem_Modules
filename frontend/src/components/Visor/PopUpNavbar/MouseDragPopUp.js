
import { ref } from 'vue';

let isDragging = ref(false);
let offsetX = ref(0);
let offsetY = ref(0);

export const startDrag = (event) => {
  let draggable = event.currentTarget;

  const rect = draggable.getBoundingClientRect();
  offsetX.value = event.clientX - rect.left;
  offsetY.value = event.clientY - rect.top;

  isDragging.value = true;

  document.onmousemove = (e)=>dragElement(e, draggable.id);
  document.onmouseup = stopDrag;
};


export const dragElement = (event, id) => {
  if (isDragging.value) {
    const draggable = document.getElementById(id);
    const draggableWidth = draggable.offsetWidth;
    const draggableHeight = draggable.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let valueLeft=event.clientX - offsetX.value;
    let valueTop=event.clientY - offsetY.value;
    if(valueLeft <0){
      valueLeft=70;
    }else if (valueLeft +draggableWidth >windowWidth){
      valueLeft=windowWidth - draggableWidth -2;
    }
    draggable.style.left = `${valueLeft}px`;
    if(valueTop <0){
      valueTop=5;
    }else if (valueTop +draggableHeight >windowHeight){
      valueTop=windowHeight -draggableHeight -5;
    }
    draggable.style.top = `${valueTop}px`;
  }
};

export const stopDrag = () => {
  isDragging.value = false;
  document.onmousemove = null;
  document.onmouseup = null;
};
