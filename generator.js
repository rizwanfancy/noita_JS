"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
const prng_1 = require("./prng");
const alchemy_materials_1 = require("./alchemy-materials");

class NoitaAlchemyGenerator {
    constructor(seed, full) {
        this.seed = seed;
        this.full = full;
        this.prng = new prng_1.NumberGenerator(this.seed * 0.17127000 + 1323.59030000);
        for (let i = 0; i < 5; i++) {
            this.prng.next();
        }
        this.livelyConcoction = this.getRandomRecipe();
        this.alchemicalPrecursor = this.getRandomRecipe();
    }

    chooseRandomMaterials(target, materialList, iterations) {
        for (let i = 0; i < iterations; i++) {
            const rand = this.prng.next();
            const pick = materialList[(rand * materialList.length) | 0];
            if (target.has(pick)) {
                i--;
                continue;
            }
            target.add(pick);
        }
    }

    getRandomRecipe() {
        const materials = new list_1.List();
        this.chooseRandomMaterials(materials, alchemy_materials_1.liquidMaterials, 3);
        this.chooseRandomMaterials(materials, alchemy_materials_1.alchemyMaterials, 1);
        let probability = this.prng.next();
        this.prng.next();
        probability = (10 - ((probability * -91) | 0));
        this.shuffle(materials);
        if (!this.full && materials.length === 4) {
            materials.removeAt(materials.length - 1);
        }
        return {
            probability,
            materials: materials.array
        };
    }
    shuffle(list) {
        const seed = ((this.seed >> 1) | 0) + 0x30f6;
        const prng = new prng_1.NumberGenerator(seed);
        for (let i = list.length - 1; i >= 0; i--) {
            const swapIndex = (prng.next() * (i + 1)) | 0;
            const element = list.array[i];
            list.array[i] = list.array[swapIndex];
            list.array[swapIndex] = element;
        }
    }
}
exports.NoitaAlchemyGenerator = NoitaAlchemyGenerator;
