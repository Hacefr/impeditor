/**
 * Visual Transform Gizmos
 * Enables interactive Dragging, Scaling, and Rotation for characters and props.
 */
export class TransformGizmos {
  constructor(pixiApp, onSelectObject) {
    this.app = pixiApp;
    this.onSelectObject = onSelectObject;
    this.selectedTarget = null;

    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  attach(displayObject, idName) {
    displayObject.interactive = true;
    displayObject.cursor = 'move';
    displayObject.name = idName;

    displayObject.on('pointerdown', (e) => {
      this.selectedTarget = displayObject;
      this.isDragging = true;
      this.dragOffset = e.data.getLocalPosition(displayObject.parent);
      this.dragOffset.x -= displayObject.x;
      this.dragOffset.y -= displayObject.y;

      if (this.onSelectObject) {
        this.onSelectObject(displayObject, idName);
      }
      e.stopPropagation();
    });

    displayObject.on('pointermove', (e) => {
      if (this.isDragging && this.selectedTarget === displayObject) {
        const newPos = e.data.getLocalPosition(displayObject.parent);
        displayObject.x = newPos.x - this.dragOffset.x;
        displayObject.y = newPos.y - this.dragOffset.y;
      }
    });

    displayObject.on('pointerup', () => this.isDragging = false);
    displayObject.on('pointerupoutside', () => this.isDragging = false);
  }

  setScale(scaleVal) {
    if (this.selectedTarget) {
      this.selectedTarget.scale.set(scaleVal);
    }
  }

  setRotation(degrees) {
    if (this.selectedTarget) {
      this.selectedTarget.rotation = degrees * (Math.PI / 180);
    }
  }

  setOpacity(alphaVal) {
    if (this.selectedTarget) {
      this.selectedTarget.alpha = alphaVal;
    }
  }
}
