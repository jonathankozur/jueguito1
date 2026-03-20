export default class PickupEntity {
    constructor(id, x, y, pickupType, data = {}) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.pickupType = pickupType;
        this.radius = data.radius || 12;
        this.color = data.color || 0xffffff;
        this.name = data.name || pickupType;
        this.data = {
            ...data,
            effect: data.effect ? { ...data.effect } : undefined
        };
    }

    update() {
        // Pickups are static for now.
    }
}
