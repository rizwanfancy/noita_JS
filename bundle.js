function seeding(seed) {
  debugger;
  const generator = new NoitaAlchemyGenerator(seed, false);
  if (generator) {
    var html = `<div class="lc">
	  <h3>Lively Concoction</h3>
	  <small>Probability: ${generator.livelyConcoction.probability}%</small>
	  <ul>
		  ${generator.livelyConcoction.materials.map(mat => `<li>${mat}</li>`).join("")}
	  </ul>
  </div>
  <div class="ap">
	  <h3>Alchemical Precursor</h3>
	  <small>Probability: ${generator.alchemicalPrecursor.probability}%</small>
	  <ul>
		  ${generator.alchemicalPrecursor.materials
        .map(mat => `<li>${mat}</li>`)
        .join("")}
	  </ul>
  </div>`;
    debugger;
    document.getElementById("output").innerHTML = html;
  }
  debugger;
}

class List {
  constructor() {
    this.set = new Set();
    this.array = [];
  }
  get length() {
    return this.array.length;
  }
  has(value) {
    return this.set.has(value);
  }
  add(value) {
    if (!this.has(value)) {
      this.set.add(value);
      this.array.push(value);
    }
  }
  remove(value) {
    if (this.has(value)) {
      this.set.delete(value);
      for (let i = 0; i < this.array.length; i++) {
        if (this.array[i] === value) {
          this.array.splice(i, 1);
          break;
        }
      }
    }
  }
  removeAt(index) {
    if (this.array.length - 1 < index) {
      return;
    }
    const [value] = this.array.splice(index, 1);
    this.set.delete(value);
  }
}

const intMax = 0x7fffffff;
const a32 = new Int32Array(2);
class NumberGenerator {
  constructor(seed) {
    this.seed = seed;
    this.next();
  }

  seedIn = 0;
  next() {
    // debugger;
    // if (this.seedIn === undefined) seedIn = 0;
    // this.seedIn = Number(this.seedIn) * 16807 + (Number(this.seedIn) / 127773) * -0x7fffffff;
    // if (this.seedIn < 0) this.Seed += Number.MAX_VALUE;
    // return this.seedIn / Number.MAX_VALUE;

    const intSeed = this.seed | 0;
    a32[0] = intSeed;
    a32[0] *= 16807;
    a32[1] = intSeed;
    a32[1] /= 127773;
    a32[1] *= -intMax;
    a32[0] += a32[1];
    if (a32[0] < 0) {
      a32[0] += intMax;
    }
    this.seed = a32[0];
    return this.seed / intMax;
  }
}

const liquidMaterials = [
  "water",
  "water_ice",
  "water_swamp",
  "oil",
  "alcohol",
  "swamp",
  "mud",
  "blood",
  "blood_fungi",
  "blood_worm",
  "radioactive_liquid",
  "cement",
  "acid",
  "lava",
  "urine",
  "poison",
  "magic_liquid_teleportation",
  "magic_liquid_polymorph",
  "magic_liquid_random_polymorph",
  "magic_liquid_berserk",
  "magic_liquid_charm",
  "magic_liquid_invisibility"
];
const alchemyMaterials = [
  "sand",
  "bone",
  "soil",
  "honey",
  "slime",
  "snow",
  "rotten_meat",
  "wax",
  "gold",
  "silver",
  "copper",
  "brass",
  "diamond",
  "coal",
  "gunpowder",
  "gunpowder_explosive",
  "grass",
  "fungi"
];

class NoitaAlchemyGenerator {
  constructor(seed, full) {
    this.seed = seed;
    this.full = full;
    this.prng = new NumberGenerator(this.seed * 0.17127 + 1323.5903);
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
        i -= 1;
        continue;
      }
      target.add(pick);
    }
  }
  getRandomRecipe() {
    const materials = new List();
    this.chooseRandomMaterials(materials, liquidMaterials, 3);
    this.chooseRandomMaterials(materials, alchemyMaterials, 1);
    let probability = this.prng.next();
    this.prng.next();
    probability = 10 - ((probability * -91) | 0);
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
    const prng = new NumberGenerator(seed);
    for (let i = list.length - 1; i >= 0; i--) {
      const swapIndex = (prng.next() * (i + 1)) | 0;
      const element = list.array[i];
      list.array[i] = list.array[swapIndex];
      list.array[swapIndex] = element;
    }
  }
}

class SeedFinder {
  constructor(options) {
    this.options = options;
    this.exclude = new Set(this.options.exclude);
    this.minScoreThreshold = this.options.minScoreThreshold || 1;
    this.badMaterialThreshold = this.options.badMaterialThreshold || 17;
    this.materialWeights = Object.assign(
      {},
      defaultMaterialPreference,
      this.options.materialPreferences || {}
    );
    const required = this.options.requireMaterials || {};
    this.lcRequired = new Set(required.lc || []);
    this.apRequired = new Set(required.ap || []);
    this.minLcProbability = this.options.minLcProbability || 0;
    this.maxLcProbability = this.options.maxLcProbability || 100;
    this.minApProbability = this.options.minApProbability || 0;
    this.maxApProbability = this.options.maxApProbability || 100;
  }
  /**
   * Start looking for seeds
   *
   * @param start The seed to start at while checking
   * @param count The number of seeds to check before stopping
   */
  seek(start, count) {
    const end = start + count;
    let canceled = false;
    const cancel = () => (canceled = true);
    for (let seed = start; seed < end; seed++) {
      const result = this.calculateSeed(seed);
      if (
        result.score < this.minScoreThreshold ||
        result.hasExcluded ||
        !result.hasIncluded ||
        result.hasBadMat ||
        result.hasBadProbability
      ) {
        continue;
      }
      this.emit("seed", result, cancel);
      if (canceled) {
        break;
      }
    }
    this.emit("done");
  }

  calculateSeed(seed) {
    debugger;
    const generator = new NoitaAlchemyGenerator(seed, false);
    let score = 100;
    let hasBadMat = false;
    let hasExcluded = false;
    let hasBadProbability = false;
    const used = new Set();
    const materials = [
      ...generator.livelyConcoction.materials,
      ...generator.alchemicalPrecursor.materials
    ];
    let stillRequired = this.apRequired.size + this.lcRequired.size;
    const processMats = (recipe, required, minProb, maxProb) => {
      if (recipe.probability < minProb || recipe.probability > maxProb) {
        hasBadProbability = true;
      }
      for (let i = 0; i < 3; i++) {
        const mat = recipe.materials[i];
        if (required.has(mat)) {
          stillRequired--;
        }
        if (used.has(mat)) {
          continue;
        }
        used.add(mat);
        const matScore = this.materialWeights[mat];
        if (matScore > this.badMaterialThreshold) {
          hasBadMat = true;
        }
        if (this.exclude.has(mat)) {
          hasExcluded = true;
        }
        score -= matScore;
      }
    };
    processMats(
      generator.livelyConcoction,
      this.lcRequired,
      this.minLcProbability,
      this.maxLcProbability
    );
    processMats(
      generator.alchemicalPrecursor,
      this.apRequired,
      this.minApProbability,
      this.maxApProbability
    );
    return {
      seed,
      score,
      hasBadMat,
      hasExcluded,
      hasBadProbability,
      hasIncluded: !stillRequired,
      livelyConcoction: generator.livelyConcoction,
      alchemicalPrecursor: generator.alchemicalPrecursor
    };
  }
}
const defaultMaterialPreference = {
  water: 0,
  blood: 1,
  oil: 1,
  magic_liquid_charm: 1,
  magic_liquid_berserk: 1,
  magic_liquid_invisibility: 1,
  alcohol: 2,
  snow: 3,
  sand: 3,
  acid: 5,
  poison: 5,
  rotten_meat: 5,
  water_ice: 5,
  water_swamp: 5,
  magic_liquid_polymorph: 6,
  magic_liquid_random_polymorph: 6,
  magic_liquid_teleportation: 6,
  // Finally, the stuff that is really hard to find, or is just dangerous
  blood_worm: 7,
  bone: 7,
  lava: 10,
  coal: 12,
  gunpowder: 12,
  fungi: 15,
  gunpowder_explosive: 15,
  urine: 15,
  wax: 15,
  gold: 15,
  silver: 15,
  copper: 15,
  brass: 15,
  diamond: 15,
  // Default to "bad" until I care enough to clean up
  swamp: 16,
  mud: 16,
  blood_fungi: 16,
  radioactive_liquid: 16,
  cement: 16,
  soil: 16,
  honey: 16,
  slime: 16,
  grass: 16
};

const displayNames = {
  $mat_acid: "acid",
  $mat_acid_gas: "flammable gas",
  $mat_acid_gas_static: "flammable gas",
  $mat_air: "air",
  $mat_alcohol: "whiskey",
  $mat_aluminium: "aluminium",
  $mat_aluminium_molten: "molten aluminium",
  $mat_aluminium_oxide: "aluminium",
  $mat_aluminium_oxide_molten: "molten aluminium",
  $mat_aluminium_robot_molten: "molten aluminium",
  $mat_blood: "blood",
  $mat_blood_cold: "freezing liquid",
  $mat_blood_cold_vapour: "freezing vapour",
  $mat_blood_fading: "blood",
  $mat_blood_fading_slow: "fungal blood",
  $mat_blood_fungi: "fungus",
  $mat_blood_thick: "blood",
  $mat_blood_worm: "worm blood",
  $mat_bluefungi_static: "blue fungus",
  $mat_bone: "bone dust",
  $mat_bone_box2d: "bone",
  $mat_bone_static: "bone wall",
  $mat_brass: "brass",
  $mat_brass_molten: "molten brass",
  $mat_brick: "brick wall",
  $mat_burning_powder: "burning powder",
  $mat_bush_seed: "evergreen seed",
  $mat_cactus: "grass",
  $mat_ceiling_plant_material: "seed",
  $mat_cement: "cement",
  $mat_cheese_static: "cheese",
  $mat_cloud: "cloud",
  $mat_cloud_alcohol: "alcohol mist",
  $mat_cloud_blood: "blood mist",
  $mat_cloud_radioactive: "toxic mist",
  $mat_cloud_slime: "slime mist",
  $mat_coal: "coal",
  $mat_coal_static: "coal vein",
  $mat_cocoon_box2d: "cocoon",
  $mat_concrete_collapsed: "collapsed concrete",
  $mat_concrete_sand: "concrete",
  $mat_concrete_static: "concrete",
  $mat_copper: "copper",
  $mat_copper_molten: "molten copper",
  $mat_corruption_static: "corrupted rock",
  $mat_creepy_liquid: "creepy liquid",
  $mat_creepy_liquid_emitter: "brick wall",
  $mat_crystal: "crystal",
  $mat_crystal_magic: "crystal",
  $mat_crystal_purple: "purple crystal",
  $mat_diamond: "diamond",
  $mat_endslime: "hell slime",
  $mat_endslime_blood: "hell slime",
  $mat_endslime_static: "hell slime",
  $mat_explosion_dirt: "dirt",
  $mat_fire: "fire",
  $mat_fire_blue: "fire",
  $mat_flame: "fire",
  $mat_fungal_gas: "fungal gas",
  $mat_fungi: "fungus",
  $mat_fungi_green: "fungus",
  $mat_fungisoil: "fungal soil",
  $mat_fungus_loose: "fungus",
  $mat_fuse: "bomb",
  $mat_fuse_holy: "holy matter",
  $mat_fuse_tnt: "tnt",
  $mat_gem_box2d: "gem",
  $mat_gem_box2d_green: "gem",
  $mat_gem_box2d_orange: "gem",
  $mat_gem_box2d_pink: "gem",
  $mat_gem_box2d_red: "gem",
  $mat_glass: "glass",
  $mat_glass_box2d: "glass",
  $mat_glass_brittle: "brittle glass",
  $mat_glass_broken_molten: "molten glass",
  $mat_glass_molten: "molten glass",
  $mat_glass_static: "glass",
  $mat_glowshroom: "glowing fungal spore",
  $mat_glowstone: "glowing stone",
  $mat_glowstone_altar: "glowing stone",
  $mat_glowstone_potion: "glowing stone",
  $mat_gold: "gold",
  $mat_gold_b2: "gold",
  $mat_gold_box2d: "gold",
  $mat_gold_molten: "molten gold",
  $mat_gold_radioactive: "toxic gold",
  $mat_gold_static: "gold vein",
  $mat_gold_static_dark: "vibrant gold vein",
  $mat_grass: "grass",
  $mat_grass_loose: "fungal matter",
  $mat_gunpowder: "gunpowder",
  $mat_gunpowder_explosive: "gunpowder",
  $mat_gunpowder_tnt: "gunpowder",
  $mat_gunpowder_unstable: "gunpowder",
  $mat_gunpowder_unstable_boss_limbs: "slimy meat",
  $mat_honey: "honey",
  $mat_ice: "ice",
  $mat_ice_acid_glass: "frozen acid",
  $mat_ice_acid_static: "frozen acid",
  $mat_ice_b2: "ice",
  $mat_ice_blood_static: "frozen blood",
  $mat_ice_ceiling: "ice",
  $mat_ice_cold_glass: "ice",
  $mat_ice_cold_static: "ice",
  $mat_ice_glass: "ice",
  $mat_ice_glass_b2: "ice",
  $mat_ice_melting_perf_killer: "ice",
  $mat_ice_meteor_static: "ice",
  $mat_ice_radioactive_glass: "toxic ice",
  $mat_ice_radioactive_static: "toxic ice",
  $mat_ice_static: "ice",
  $mat_item_box2d: "item",
  $mat_lava: "lava",
  $mat_lavarock_static: "volcanic rock",
  $mat_lavasand: "volcanic sand",
  $mat_liquid_fire: "fire",
  $mat_liquid_fire_weak: "liquid fire",
  $mat_magic_liquid: "gate-opener",
  $mat_magic_liquid_berserk: "berserkium",
  $mat_magic_liquid_charm: "pheromone",
  $mat_magic_liquid_hp_regeneration: "healthium",
  $mat_magic_liquid_hp_regeneration_unstable: "lively concoction",
  $mat_magic_liquid_invisibility: "invisiblium",
  $mat_magic_liquid_polymorph: "polymorphine",
  $mat_magic_liquid_random_polymorph: "chaotic polymorphine",
  $mat_magic_liquid_teleportation: "teleportatium",
  $mat_meat: "meat",
  $mat_meat_slime: "slimy meat",
  $mat_meat_slime_green: "green slimy meat",
  $mat_meat_slime_orange: "slimy meat",
  $mat_meat_slime_sand: "slimy meat",
  $mat_meat_worm: "worm meat",
  $mat_metal: "metal",
  $mat_metal_molten: "molten metal",
  $mat_metal_nohit: "metal",
  $mat_metal_nohit_molten: "molten metal",
  $mat_metal_prop: "metal",
  $mat_metal_prop_molten: "molten metal",
  $mat_metal_rust: "rusted metal",
  $mat_metal_rust_barrel: "rusted metal",
  $mat_metal_rust_barrel_rust: "rusted metal",
  $mat_metal_rust_molten: "molten metal",
  $mat_metal_rust_rust: "rusted metal",
  $mat_meteorite: "meteorite",
  $mat_meteorite_crackable: "meteorite",
  $mat_meteorite_green: "green meteorite",
  $mat_meteorite_static: "meteorite",
  $mat_midas: "draught of midas",
  $mat_midas_precursor: "alchemic precursor",
  $mat_moss: "moss",
  $mat_moss_rust: "rusty moss",
  $mat_mud: "mud",
  $mat_mushroom: "fungal spore",
  $mat_mushroom_giant_blue: "fungal spore",
  $mat_mushroom_giant_red: "fungal spore",
  $mat_mushroom_seed: "fungal spore",
  $mat_neon_tube_blood_red: "neon tube",
  $mat_neon_tube_cyan: "neon tube",
  $mat_neon_tube_purple: "neon tube",
  $mat_nest_box2d: "nest",
  $mat_nest_static: "nest",
  $mat_oil: "oil",
  $mat_pea_soup: "pea soup",
  $mat_physics_throw_material_part2: "who knows",
  $mat_plant_material: "plant material",
  $mat_plant_material_red: "seed",
  $mat_plant_seed: "plant seed",
  $mat_plasma_fading: "magical liquid",
  $mat_plasma_fading_green: "magical liquid",
  $mat_plasma_fading_pink: "magical liquid",
  $mat_plastic: "plastic",
  $mat_plastic_molten: "molten plastic",
  $mat_plastic_prop_molten: "molten plastic",
  $mat_plastic_red: "plastic",
  $mat_plastic_red_molten: "molten plastic",
  $mat_poison: "glowing liquid",
  $mat_poison_gas: "poison gas",
  $mat_poo: "excrement",
  $mat_potion_glass_box2d: "glass",
  $mat_radioactive_gas: "toxic gas",
  $mat_radioactive_gas_static: "toxic gas",
  $mat_radioactive_liquid: "toxic sludge",
  $mat_radioactive_liquid_fading: "toxic sludge",
  $mat_radioactive_liquid_yellow: "toxic sludge",
  $mat_rock_box2d: "rock",
  $mat_rock_box2d_hard: "rock",
  $mat_rock_box2d_nohit: "rock",
  $mat_rock_box2d_nohit_hard: "dense rock",
  $mat_rock_eroding: "eroding rock",
  $mat_rock_hard: "dense rock",
  $mat_rock_hard_border: "extremely dense rock",
  $mat_rock_loose: "rock",
  $mat_rock_magic_bottom: "magic wall",
  $mat_rock_magic_gate: "magic gate",
  $mat_rock_static: "rock",
  $mat_rock_static_box2d: "rock",
  $mat_rock_static_glow: "glowing matter",
  $mat_rock_static_grey: "grey rock",
  $mat_rock_static_intro: "rock",
  $mat_rock_static_intro_breakable: "rock",
  $mat_rock_static_noedge: "rock",
  $mat_rock_static_poison: "poisonous rock",
  $mat_rock_static_radioactive: "toxic rock",
  $mat_rock_static_wet: "damp rock",
  $mat_rock_vault: "vault rock",
  $mat_rocket_particles: "smoke",
  $mat_root: "vine",
  $mat_rotten_meat: "rotten meat",
  $mat_rotten_meat_radioactive: "toxic meat",
  $mat_rust_static: "rusted metal",
  $mat_salt: "salt",
  $mat_sand: "sand",
  $mat_sand_blue: "blue sand",
  $mat_sand_herb: "herb",
  $mat_sand_herb_vapour: "funky vapour",
  $mat_sand_static: "ground",
  $mat_sand_static_bright: "granite ground",
  $mat_sand_static_rainforest: "lush ground",
  $mat_sand_static_red: "rusty ground",
  $mat_sandstone: "sandstone",
  $mat_silver: "silver",
  $mat_silver_molten: "molten silver",
  $mat_skullrock: "hell rock",
  $mat_slime_green: "slime",
  $mat_slime_pink: "slime",
  $mat_slime_static: "slime",
  $mat_smoke: "smoke",
  $mat_smoke_explosion: "smoke",
  $mat_smoke_magic: "smoke",
  $mat_smoke_static: "smoke",
  $mat_snow: "snow",
  $mat_snow_b2: "snow",
  $mat_snow_static: "packed snow",
  $mat_snowrock_static: "frozen rock",
  $mat_sodium: "sodium",
  $mat_sodium_unstable: "wet sodium",
  $mat_soil: "soil",
  $mat_soil_dead: "barren soil",
  $mat_soil_lush: "soil",
  $mat_spark: "spark",
  $mat_spark_blue: "spark",
  $mat_spark_electric: "electric spark",
  $mat_spark_green: "spark",
  $mat_spark_player: "spark",
  $mat_spark_purple: "spark",
  $mat_spark_red: "spark",
  $mat_spark_teal: "spark",
  $mat_spark_white: "spark",
  $mat_spark_yellow: "spark",
  $mat_spore: "seed",
  $mat_steam: "steam",
  $mat_steel: "steel",
  $mat_steel_molten: "molten metal",
  $mat_steel_rust: "rusted steel",
  $mat_steel_rust_molten: "molten steel",
  $mat_steel_sand: "steel",
  $mat_steel_static: "steel",
  $mat_steel_static_molten: "molten steel",
  $mat_steel_static_strong: "dense steel",
  $mat_steel_static_unmeltable: "hardened steel",
  $mat_steelmoss_slanted: "mossy steel",
  $mat_steelmoss_slanted_molten: "molten steel",
  $mat_steelmoss_static: "mossy steel",
  $mat_steelmoss_static_molten: "molten steel",
  $mat_steelpipe_static: "metal pipe",
  $mat_steelsmoke_static: "smoking steel",
  $mat_steelsmoke_static_molten: "molten steel",
  $mat_sulphur: "sulphur",
  $mat_swamp: "swamp",
  $mat_templebrick_box2d: "brickwork",
  $mat_templebrick_moss_static: "mossy brickwork",
  $mat_templebrick_noedge_static: "brickwork",
  $mat_templebrick_red: "brickwork",
  $mat_templebrick_static: "brickwork",
  $mat_templebrick_thick_static: "brickwork",
  $mat_templebrickdark_static: "brickwork",
  $mat_templerock_static: "brickwork",
  $mat_the_end: "hell rock",
  $mat_tnt: "tnt",
  $mat_trailer_text: "text",
  $mat_tube_physics: "neon tube",
  $mat_tubematerial: "neon tube",
  $mat_urine: "urine",
  $mat_vine: "vine",
  $mat_water: "Water",
  $mat_water_fading: "Water",
  $mat_water_ice: "chilly water",
  $mat_water_salt: "brine",
  $mat_water_static: "Water",
  $mat_water_swamp: "swamp",
  $mat_water_temp: "Water",
  $mat_waterrock: "rock",
  $mat_wax: "wax",
  $mat_wax_b2: "wax",
  $mat_wax_molten: "molten wax",
  $mat_wood: "wood",
  $mat_wood_loose: "wood",
  $mat_wood_player: "wood",
  $mat_wood_player_b2: "wood",
  $mat_wood_player_b2_vertical: "wood",
  $mat_wood_prop: "wood",
  $mat_wood_prop_durable: "tough wood",
  $mat_wood_static: "wood",
  $mat_wood_static_gas: "pressurized wood",
  $mat_wood_static_vertical: "wood",
  $mat_wood_static_wet: "damp wood",
  $mat_wood_trailer: "wood",
  $mat_wood_wall: "wood"
};

class MaterialColor {
  constructor(hex) {
    this.hex = hex;
    this.red = parseInt(hex[0] + hex[1], 16);
    this.green = parseInt(hex[2] + hex[3], 16);
    this.blue = parseInt(hex[4] + hex[5], 16);
    this.alpha = parseAlpha(hex);
  }
}
const parseAlpha = hex => {
  const raw = parseInt(hex[6] + hex[7], 16);
  const percent = raw / 255;
  const rounded = Math.round(percent * 100) / 100;
  return rounded;
};

class MaterialGraphics {
  constructor(data) {
    this.color = color(data.attr.color);
    this.pixelAllAround = color(data.attr.pixel_all_around);
    this.pixelLonely = color(data.attr.pixel_lonely);
    this.pixelTopRight = color(data.attr.pixel_top_right);
    this.pixelBottomLeft = color(data.attr.pixel_bottom_left);
    this.pixelLeft = color(data.attr.pixel_left);
    this.pixelTopLeft = color(data.attr.pixel_top_left);
    this.pixelTop = color(data.attr.pixel_top);
    this.pixelRight = color(data.attr.pixel_right);
    this.pixelBottomRight = color(data.attr.pixel_bottom_right);
    this.pixelBottom = color(data.attr.pixel_bottom);
    this.fireColorsIndex = data.attr.fire_colors_index;
    this.textureFile = data.attr.texture_file;
    this.normalMapped = !!data.attr.normal_mapped;
    this.isGrass = !!data.attr.is_grass;
    this.audioPhysicsMaterialWall = data.attr.audio_physics_material_wall;
    this.audioPhysicsMaterialSolid = data.attr.audio_physics_material_solid;
  }
}
const color = value => {
  if (value) {
    return new MaterialColor(value);
  }
};

class MaterialCell {
  constructor(data) {
    this.name = data.attr.name;
    this.uiName = data.attr.ui_name;
    this.displayName = displayNames[data.attr.ui_name];
    this.parent = data.attr._parent;
    this.tags = data.attr.tags ? new Set(data.attr.tags.split(",")) : new Set();
    this.graphics = data.Graphics ? new MaterialGraphics(data.Graphics) : null;
    this.attrs = data.attr;
  }
}

class Reaction {
  constructor(data) {
    this.probability = data.attr.probability;
    this.input1 = processInputOutput(data.attr.input_cell1);
    this.input2 = processInputOutput(data.attr.input_cell2);
    if (data.attr.input_cell3) {
      this.input3 = processInputOutput(data.attr.input_cell3);
    }
    this.output1 = processInputOutput(data.attr.output_cell1);
    this.output2 = processInputOutput(data.attr.output_cell2);
    this.attr = data.attr;
  }
}
const processInputOutput = inputOutput => {
  if (inputOutput.indexOf("[") === 0) {
    if (inputOutput.indexOf("]_") >= 0) {
      const chunks = inputOutput.split("]_");
      const tag = chunks[0] + "]";
      const modifier = chunks[1];
      return { tag, modifier };
    }
    return { tag: inputOutput };
  }
  return { material: inputOutput };
};

const processMaterialsXML = json => {
  const materials = processMaterials([
    ...json.Materials.CellData,
    ...json.Materials.CellDataChild
  ]);
  const reactions = processReactions(json.Materials.Reaction);
  const reqReactions = processReactions(json.Materials.ReqReaction);
  return {
    materials,
    reactions,
    reqReactions
  };
};
const processMaterials = rawMaterials => {
  // Index of materials by their "name" attribute
  const materialsByName = {};
  // Index of materials by the tags they possess
  const materialsByTag = {};
  // Array of all materials
  const materials = rawMaterials.map(rawMaterial => {
    const material = new MaterialCell(rawMaterial);
    materialsByName[material.name] = material;
    material.tags.forEach(tag => {
      if (!materialsByTag[tag]) {
        materialsByTag[tag] = new Set();
      }
      materialsByTag[tag].add(material);
    });
    return material;
  });
  return {
    materials,
    materialsByName,
    materialsByTag
  };
};
const processReactions = rawReactions => {
  // Index of reactions by the input materials
  const reactionsByInputMaterial = {};
  // Index of reactions by the output materials
  const reactionsByOutputMaterial = {};
  // Index of reactions by the input tags
  const reactionsByInputTag = {};
  // Index of reactions by the output tags
  const reactionsByOutputTag = {};
  function addTo(map, key, reaction) {
    if (!map[key]) {
      map[key] = new Set();
    }
    map[key].add(reaction);
  }
  const addInput = (input, reaction) => {
    if (!input) {
      return;
    }
    if (input.material) {
      addTo(reactionsByInputMaterial, input.material, reaction);
    } else {
      addTo(reactionsByInputTag, input.tag, reaction);
    }
  };
  const addOutput = (output, reaction) => {
    if (!output) {
      return;
    }
    if (output.material) {
      addTo(reactionsByOutputMaterial, output.material, reaction);
    } else {
      addTo(reactionsByOutputTag, output.tag, reaction);
    }
  };
  const reactions = rawReactions.map(rawReaction => {
    const reaction = new Reaction(rawReaction);
    addInput(reaction.input1, reaction);
    addInput(reaction.input2, reaction);
    addInput(reaction.input3, reaction);
    addOutput(reaction.output1, reaction);
    addOutput(reaction.output2, reaction);
    return reaction;
  });
  return {
    reactions,
    reactionsByInputMaterial,
    reactionsByOutputMaterial,
    reactionsByInputTag,
    reactionsByOutputTag
  };
};

const generateRecipes = seed => {
  const generator = new NoitaAlchemyGenerator(seed, false);
  return {
    lc: generator.livelyConcoction,
    ap: generator.alchemicalPrecursor
  };
};

// seeds.html
function seedsPage() {
  const checkSeed = document.querySelector("#check-seed");
  const checkSeedInput = checkSeed.querySelector("input");
  const checkSeedButton = checkSeed.querySelector("button");
  const checkSeedOutput = checkSeed.querySelector(".output");

  checkSeedButton.addEventListener("click", () => {
    const seed = parseInt(checkSeedInput.value, 10);
    const recipes = generateRecipes(seed);

    checkSeedOutput.innerHTML = `
			<div class="lc">
				<h3>Lively Concoction</h3>
				<small>Probability: ${recipes.lc.probability}%</small>
				<ul>
					${recipes.lc.materials.map(mat => `<li>${mat}</li>`).join("")}
				</ul>
			</div>
			<div class="ap">
				<h3>Alchemical Precursor</h3>
				<small>Probability: ${recipes.ap.probability}%</small>
				<ul>
					${recipes.ap.materials.map(mat => `<li>${mat}</li>`).join("")}
				</ul>
			</div>
		`;
  });
}
