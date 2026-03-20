export default class StaticObstacleEntity {
    constructor(id, x, y, width, height, material = 'hard', heightLevel = 'high', options = {}) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.material = material;
        this.heightLevel = heightLevel;
        this.penetrableDuringDash = !!options.penetrableDuringDash;
    }

    update() {
        // Static obstacles don't need to do anything
    }
}
