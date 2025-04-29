// Projectile.js
// Base class and system for handling projectiles (bullets, shells, missiles, rockets) in the game.
// Integrates with Three.js for visuals and Ammo.js for physics/collision.

import * as THREE from 'three';
import { spawnMuzzleFlash, attachProjectileTrail, spawnImpactEffect } from './ProjectileEffects';

/**
 * @typedef {Object} ProjectileOptions
 * @property {string} type - 'bullet' | 'shell' | 'missile' | 'rocket'
 * @property {THREE.Vector3} position
 * @property {THREE.Vector3} direction
 * @property {number} speed
 * @property {number} [damage]
 * @property {function} [onHit] - Callback when projectile hits something
 * @property {object} [ammoWorld] - Ammo.js world
 * @property {object} [scene] - Three.js scene
 * @property {object} [target] - For guided projectiles
 */

class BaseProjectile {
    /**
     * @param {ProjectileOptions} options
     */
    constructor(options) {
        this.type = options.type;
        this.position = options.position.clone();
        this.direction = options.direction.clone().normalize();
        this.speed = options.speed;
        this.damage = options.damage || 0;
        this.onHit = options.onHit || (() => {});
        this.ammoWorld = options.ammoWorld;
        this.scene = options.scene;
        this.target = options.target || null;
        this.alive = true;

        // Visual representation
        this.mesh = this.createMesh();
        this.mesh.position.copy(this.position);
        this.scene && this.scene.add(this.mesh);
        // --- Visual Effects ---
        if (this.scene) {
            spawnMuzzleFlash(this.scene, this.position, this.direction, this.type);
            attachProjectileTrail(this.scene, this.mesh, this.type);
        }

        // Ammo.js body (optional for physics)
        this.rigidBody = null;
        if (this.ammoWorld) {
            this.rigidBody = this.createRigidBody();
            this.ammoWorld.addRigidBody(this.rigidBody);
        }
    }

    /**
     * Creates a Three.js mesh for the projectile.
     */
    createMesh() {
        let geometry, material;
        switch (this.type) {
            case 'bullet':
                geometry = new THREE.SphereGeometry(0.05, 8, 8);
                material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                break;
            case 'shell':
                geometry = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8);
                material = new THREE.MeshBasicMaterial({ color: 0xff8800 });
                break;
            case 'missile':
                geometry = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
                material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                break;
            case 'rocket':
                geometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
                material = new THREE.MeshBasicMaterial({ color: 0xffffff });
                break;
            default:
                geometry = new THREE.SphereGeometry(0.05, 8, 8);
                material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        }
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Optionally create an Ammo.js rigid body for physical simulation.
     */
    createRigidBody() {
        // Stub: implement as needed for physical projectiles
        return null;
    }

    /**
     * Update projectile position and logic (call on each frame or physics tick).
     * @param {number} deltaTime
     */
    update(deltaTime, potentialTargets = []) {
        if (!this.alive) return;
        // Simple straight movement (override for ballistic/guided)
        const move = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(move);
        this.mesh.position.copy(this.position);

        // Simple collision detection (bounding sphere)
        for (const target of potentialTargets) {
            if (!target || typeof target.getPosition !== 'function' || typeof target.takeDamage !== 'function') continue;
            const dist = this.position.distanceTo(target.getPosition());
            // Assume aircraft have ~2 unit radius for demo
            if (dist < 2.0 && target.state !== 'destroyed') {
                // Apply damage
                const result = target.takeDamage(this.damage, { projectile: this });
                this.onHit(target, result);
                // Impact effect
                if (this.scene) {
                    spawnImpactEffect(this.scene, this.position, this.type);
                }
                // --- Hit Marker: Only for player projectiles hitting enemies ---
                if (typeof window !== 'undefined' && window.playerAircraft && this.firedBy === window.playerAircraft && typeof window.triggerPlayerHitMarker === 'function') {
                    window.triggerPlayerHitMarker();
                }
                // Optionally trigger hit marker, explosion, etc.
                this.destroy();
                break;
            }
        }
        // TODO: Add boundary checks, destroy if out of bounds
    }

    /**
     * Destroy the projectile (remove from scene and physics world).
     */
    destroy() {
        this.alive = false;
        if (this.scene && this.mesh) this.scene.remove(this.mesh);
        if (this.ammoWorld && this.rigidBody) this.ammoWorld.removeRigidBody(this.rigidBody);
    }
}

export default BaseProjectile;
