export default class StaticObstacleEntity {
    constructor(id, x, y, width, height, material = 'hard', heightLevel = 'high') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.material = material; // 'soft', 'medium', 'hard'
        this.heightLevel = heightLevel; // 'low' (sobrepasable), 'high' (bloquea arrojadizas)
    }

    update() {
        // Static obstacles don't need to do anything
    }
}
