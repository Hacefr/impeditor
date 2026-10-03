/**
 * Visual Transform Gizmos
 * Enables interactive Dragging, Scaling, and Rotation for characters and props.
 * Compatible with PixiJS v7 and v8 event models.
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
    displayObject.eventMode = 'static'; // PixiJS v7+ recommended
    displayObject.cursor = 'move';
    displayObject.name = idName;

    displayObject.on('pointerdown', (e) => {
      this.selectedTarget = displayObject;
      this.isDragging = true;

      // Safe cross-version coordinates retrieval
      const localPos = e.getLocalPosition 
        ? e.getLocalPosition(displayObject.parent)
        : (e.data ? e.data.getLocalPosition(displayObject.parent) : { x: e.clientX, y: e.clientY });

      this.dragOffset.x = localPos.x - displayObject.x;
      this.dragOffset.y = localPos.y - displayObject.y;

      if (this.onSelectObject) {
        this.onSelectObject(displayObject, idName);
      }
      e.stopPropagation();
    });

    displayObject.on('pointermove', (e) => {
      if (this.isDragging && this.selectedTarget === displayObject) {
        const localPos = e.getLocalPosition 
          ? e.getLocalPosition(displayObject.parent)
          : (e.data ? e.data.getLocalPosition(displayObject.parent) : { x: e.clientX, y: e.clientY });

        displayObject.x = localPos.x - this.dragOffset.x;
        displayObject.y = localPos.y - this.dragOffset.y;
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
