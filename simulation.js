// ================================================================
// Conservation of Mechanical Energy — Simulation Engine
// ================================================================

function getC(dark, light) {
    return light;
}
const el = id => document.getElementById(id);
const G = 9.8;

// ==================== FREE-FALL LAB SIMULATION ====================
class FreeFallSim {
    constructor(canvasId, idPrefix = 'lab') {
        this.idPrefix = idPrefix;
        this.canvas = el(canvasId);
        this.ctx = this.canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = rect.width;
        this.H = rect.height;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.showEnergy = true;
        this.showEnergyVals = true;

        // Physics
        this.mass = 0.250;
        this.topGateH = 1.000;   // height of top photogate (release point)
        this.bottomGateH = 0.800; // height of lower photogate
        this.ballY = 0;          // current ball position (0 = top gate)
        this.ballV = 0;
        this.dropTime = 0;
        this.measuredTime = null;
        this.measuredV = null;

        // State
        this.isDropping = false;
        this.dropComplete = false;
        this.animId = null;
        this.lastFrameTime = null;

        // Layout constants — apparatus shifted LEFT to use right half for energy panel
        this.towerX = 140;          // pole x position
        this.towerTop = 70;         // top of pole (px)
        this.towerBot = this.H - 40;
        this.pxPerMeter = (this.towerBot - this.towerTop) / 1.12;
        this.energyPanelX = this.W * 0.52; // right-half energy panel starts here

        // Data
        this.trials = [];

        this.draw();
    }

    heightToPx(h) {
        return this.towerBot - h * this.pxPerMeter;
    }

    setMass(m) { this.mass = m; this.draw(); }
    setTopGate(h) {
        this.topGateH = h;
        if (this.bottomGateH >= this.topGateH) {
            this.bottomGateH = Math.max(0, this.topGateH - 0.050);
        }
        this.resetDrop();
        this.draw();
    }
    setBottomGate(h) {
        this.bottomGateH = Math.min(h, this.topGateH - 0.010);
        this.resetDrop();
        this.draw();
    }

    resetDrop() {
        this.isDropping = false;
        this.dropComplete = false;
        this.ballY = 0;
        this.ballV = 0;
        this.dropTime = 0;
        this.measuredTime = null;
        this.measuredV = null;
        this.lastFrameTime = null;
        if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    }

    drop() {
        if (this.isDropping) return;
        this.resetDrop();
        this.isDropping = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    animate() {
        if (!this.isDropping) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
        this.lastFrameTime = now;

        this.ballV += G * dt;
        this.ballY += this.ballV * dt;
        this.dropTime += dt;

        const fallDist = this.topGateH - this.bottomGateH;
        if (this.ballY >= fallDist) {
            this.ballY = fallDist;
            const tFall = Math.sqrt(2 * fallDist / G);
            this.measuredTime = tFall;
            this.measuredV = G * tFall;
            this.isDropping = false;
            this.dropComplete = true;
            this.draw();
            this.updateReadouts();
            return;
        }

        this.draw();
        this.updateReadouts();
        this.animId = requestAnimationFrame(() => this.animate());
    }

    recordTrial() {
        if (!this.dropComplete || this.trials.length >= 6) return null;
        const h = this.bottomGateH;
        const v = this.measuredV;
        const pe = this.mass * G * h;
        const ke = 0.5 * this.mass * v * v;
        const me = pe + ke;
        const trial = {
            label: String.fromCharCode(65 + this.trials.length),
            height: h,
            time: this.measuredTime,
            velocity: v,
            pe, ke, me
        };
        this.trials.push(trial);
        return trial;
    }

    resetExperiment() {
        this.trials = [];
        this.resetDrop();
        this.draw();
    }

    updateReadouts() {
        const hGate = this.bottomGateH;
        if (el(this.idPrefix + 'Height')) el(this.idPrefix + 'Height').textContent = hGate.toFixed(3) + ' m';
        if (el(this.idPrefix + 'Trials')) el(this.idPrefix + 'Trials').textContent = this.trials.length + ' / 6';

        if (this.dropComplete && this.measuredTime !== null) {
            if (el(this.idPrefix + 'Time')) el(this.idPrefix + 'Time').textContent = this.measuredTime.toFixed(4) + ' s';
            
            if (this.showEnergy) {
                const pe = this.mass * G * hGate;
                const ke = 0.5 * this.mass * this.measuredV * this.measuredV;
                const me = pe + ke;
                if (el(this.idPrefix + 'Velocity')) el(this.idPrefix + 'Velocity').textContent = this.measuredV.toFixed(3) + ' m/s';
                if (el(this.idPrefix + 'ME')) el(this.idPrefix + 'ME').textContent = me.toFixed(3) + ' J';
            }
        } else {
            if (el(this.idPrefix + 'Time')) el(this.idPrefix + 'Time').textContent = '— s';
            if (this.showEnergy) {
                if (el(this.idPrefix + 'Velocity')) el(this.idPrefix + 'Velocity').textContent = '— m/s';
                if (el(this.idPrefix + 'ME')) el(this.idPrefix + 'ME').textContent = '— J';
            }
        }
    }

    // ---- Drawing ----
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.W * 2, this.H * 2);
        this.drawStand(ctx);
        this.drawRuler(ctx);
        this.drawPhotogates(ctx);
        this.drawBall(ctx);
        this.drawHeightAnnotation(ctx);
        this.drawLabels(ctx);
        this.drawEnergyPanel(ctx);
    }

    drawStand(ctx) {
        const x = this.towerX;
        // Base
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.fillRect(x - 45, this.towerBot, 90, 10);
        ctx.fillStyle = getC('#c9d1df', '#8b9da6');
        ctx.fillRect(x - 50, this.towerBot + 9, 100, 6);

        // Vertical pole
        const grad = ctx.createLinearGradient(x - 5, this.towerTop, x + 5, this.towerTop);
        grad.addColorStop(0, '#c8a24a');
        grad.addColorStop(0.5, '#d8b767');
        grad.addColorStop(1, '#8b7030');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 5, this.towerTop - 18, 10, this.towerBot - this.towerTop + 18);

        // Top bracket
        ctx.fillStyle = getC('#eef2f9', '#123140');
        ctx.fillRect(x - 10, this.towerTop - 22, 20, 12);

        // Release arm (horizontal, shorter)
        ctx.fillStyle = '#8b7030';
        ctx.fillRect(x, this.heightToPx(this.topGateH) - 3, 65, 6);

        // Electromagnet at end of arm
        ctx.fillStyle = getC('#ff5f7a', '#c62828');
        ctx.beginPath();
        ctx.arc(x + 65, this.heightToPx(this.topGateH), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = getC('#eef2f9', '#fff');
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EM', x + 65, this.heightToPx(this.topGateH));
    }

    drawRuler(ctx) {
        const rX = this.towerX - 58;
        const rTop = this.heightToPx(1.05);
        const rBot = this.towerBot + 4;
        const rW = 22;

        ctx.fillStyle = getC('rgba(229,204,143,0.05)', 'rgba(11,95,119,0.05)');
        ctx.fillRect(rX, rTop, rW, rBot - rTop);
        ctx.strokeStyle = getC('rgba(229,204,143,0.25)', 'rgba(11,95,119,0.25)');
        ctx.lineWidth = 1;
        ctx.strokeRect(rX, rTop, rW, rBot - rTop);

        ctx.font = '9px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let cm = 0; cm <= 105; cm += 5) {
            const h = cm / 100;
            const y = this.heightToPx(h);
            if (y < rTop || y > rBot) continue;
            const tickLen = cm % 10 === 0 ? 10 : 5;
            ctx.strokeStyle = getC('#a9b2c3', '#795548');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rX + rW, y);
            ctx.lineTo(rX + rW - tickLen, y);
            ctx.stroke();

            if (cm % 20 === 0) {
                ctx.fillStyle = getC('#a9b2c3', '#5d4037');
                ctx.fillText((cm / 100).toFixed(1), rX - 2, y);
            }
        }

        // h=0 reference line
        const zeroY = this.heightToPx(0);
        ctx.strokeStyle = '#ff5f7a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rX, zeroY);
        ctx.lineTo(rX + rW, zeroY);
        ctx.stroke();
        ctx.fillStyle = '#ff5f7a';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('h=0', rX - 2, zeroY);

        // vertical label
        ctx.save();
        ctx.translate(rX - 16, (rTop + rBot) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Height (m)', 0, 0);
        ctx.restore();
    }

    drawPhotogates(ctx) {
        this._drawGate(ctx, this.topGateH, 'Gate A (top)', '#ff5f7a');
        this._drawGate(ctx, this.bottomGateH, 'Gate B (lower)', '#4a9eff');
    }

    _drawGate(ctx, h, label, color) {
        const y = this.heightToPx(h);
        const gateLeft = this.towerX + 42;
        const gateRight = this.towerX + 88;

        // Gate posts
        ctx.fillStyle = getC('#555', '#bbb');
        ctx.fillRect(gateLeft, y - 14, 7, 28);
        ctx.fillRect(gateRight, y - 14, 7, 28);

        // Laser beam
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.75;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(gateLeft + 7, y);
        ctx.lineTo(gateRight, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;

        // Dots
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(gateLeft + 7, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(gateRight, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Labels — to the right of gate, compact
        ctx.fillStyle = color;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, gateRight + 10, y + 3);
        ctx.font = '9px Arial';
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.fillText('h = ' + h.toFixed(3) + ' m', gateRight + 10, y + 15);
    }

    drawBall(ctx) {
        const ballRadius = 11;
        const x = this.towerX + 65; // ball rides on arm end
        let y;

        if (!this.isDropping && !this.dropComplete) {
            y = this.heightToPx(this.topGateH);
        } else {
            const currentH = this.topGateH - this.ballY;
            y = this.heightToPx(currentH);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // Ball gradient
        const bg = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, ballRadius);
        bg.addColorStop(0, '#ffd54f');
        bg.addColorStop(0.5, '#ff8f00');
        bg.addColorStop(1, '#e65100');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bf360c';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Velocity arrow (small, to the right of ball)
        if (this.showEnergy && this.isDropping && this.ballV > 0.5) {
            const arrowLen = Math.min(this.ballV * 10, 60);
            ctx.strokeStyle = '#ff5f7a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 18, y);
            ctx.lineTo(x + 18, y + arrowLen);
            ctx.stroke();
            ctx.fillStyle = '#ff5f7a';
            ctx.beginPath();
            ctx.moveTo(x + 18, y + arrowLen + 5);
            ctx.lineTo(x + 14, y + arrowLen - 3);
            ctx.lineTo(x + 22, y + arrowLen - 3);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawHeightAnnotation(ctx) {
        if (!this.dropComplete) return;
        const topY = this.heightToPx(this.topGateH);
        const botY = this.heightToPx(this.bottomGateH);
        // Small bracket between the two gates, just to the right of the gate posts
        const x = this.towerX + 100;
        const fallDist = this.topGateH - this.bottomGateH;

        ctx.strokeStyle = getC('#c8a24a', '#0b5f77');
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, botY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x - 4, topY); ctx.lineTo(x + 4, topY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 4, botY); ctx.lineTo(x + 4, botY); ctx.stroke();

        ctx.fillStyle = getC('#c8a24a', '#0b5f77');
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        const midY = (topY + botY) / 2;
        ctx.fillText('Δh=' + fallDist.toFixed(2) + 'm', x + 7, midY - 8);
        ctx.font = '9px Arial';
        ctx.fillText('t=' + this.measuredTime.toFixed(3) + 's', x + 7, midY + 5);
        if (this.showEnergy && this.showEnergyVals) {
            ctx.fillText('v=' + this.measuredV.toFixed(2) + 'm/s', x + 7, midY + 18);
        }
    }

    drawLabels(ctx) {
        // Title + params — compact, top-left
        ctx.fillStyle = getC('#eef2f9', '#123140');
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Free-Fall Energy Lab', 8, 20);
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.font = '10px Arial';
        ctx.fillText('m=' + this.mass.toFixed(3) + ' kg  g=9.8 m/s²', 8, 34);

        // Reference line at h=0
        const zeroY = this.heightToPx(0);
        ctx.save();
        ctx.strokeStyle = '#ff5f7a';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(this.towerX - 62, zeroY);
        ctx.lineTo(this.towerX + 110, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    drawEnergyPanel(ctx) {
        if (!this.showEnergy) return;

        // Right-side energy panel — uses the blank space to the right of apparatus
        const px = this.energyPanelX;
        const panelW = this.W - px - 12;
        const panelTop = this.towerTop - 10;
        const panelH = this.towerBot - panelTop + 10;

        // Panel background
        ctx.fillStyle = getC('rgba(17,20,27,0.7)', 'rgba(240,248,255,0.85)');
        ctx.strokeStyle = getC('rgba(229,204,143,0.2)', 'rgba(11,95,119,0.2)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px, panelTop, panelW, panelH, 10);
        ctx.fill();
        ctx.stroke();

        const midX = px + panelW / 2;

        if (!this.dropComplete) {
            // Idle state — show setup hints
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Energy Breakdown', midX, panelTop + 22);
            ctx.font = '10px Arial';
            ctx.fillText('Drop the ball to see', midX, panelTop + 44);
            ctx.fillText('live energy values', midX, panelTop + 58);

            // Decorative dotted circle
            ctx.strokeStyle = getC('rgba(200,162,74,0.25)', 'rgba(11,95,119,0.2)');
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(midX, panelTop + panelH / 2, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = getC('rgba(200,162,74,0.4)', 'rgba(11,95,119,0.3)');
            ctx.font = '22px Arial';
            ctx.fillText('⚡', midX, panelTop + panelH / 2 + 8);
            return;
        }

        const h = this.bottomGateH;
        const v = this.measuredV;
        const pe = this.mass * G * h;
        const ke = 0.5 * this.mass * v * v;
        const me = pe + ke;
        const maxE = Math.max(me * 1.08, 0.01);

        // Title
        ctx.fillStyle = getC('#e5cc8f', '#d67b19');
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Energy Breakdown', midX, panelTop + 20);

        // Vertical stacked bar showing PE+KE
        const barTop = panelTop + 32;
        const barBot2 = panelTop + panelH - 80;
        const barH = barBot2 - barTop;
        const barW = Math.min(panelW * 0.38, 36);
        const barLeft = midX - barW / 2;

        // ME outline (total height)
        ctx.fillStyle = getC('rgba(92,191,121,0.12)', 'rgba(46,125,50,0.1)');
        ctx.strokeStyle = getC('#5cbf79', '#2e7d32');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(barLeft, barTop, barW, barH, 4);
        ctx.fill();
        ctx.stroke();

        // PE segment (top)
        const peH = (pe / maxE) * barH;
        const keH = (ke / maxE) * barH;
        ctx.fillStyle = getC('#4a9eff', '#2979ff');
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(barLeft, barTop, barW, peH, [4, 4, 0, 0]);
        ctx.fill();
        ctx.globalAlpha = 1;

        // KE segment (bottom)
        ctx.fillStyle = getC('#ff8c42', '#e65100');
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(barLeft, barTop + peH, barW, keH, [0, 0, 4, 4]);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Value labels to the right of the bar
        const labelX = barLeft + barW + 8;
        const labelStyle = (color, text1, text2, cy) => {
            ctx.fillStyle = color;
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(text1, labelX, cy - 3);
            ctx.font = '9px Arial';
            ctx.fillStyle = getC('#eef2f9', '#123140');
            ctx.fillText(text2, labelX, cy + 9);
        };

        if (peH > 14) labelStyle(getC('#4a9eff','#2979ff'), 'PE', this.showEnergyVals ? pe.toFixed(3)+'J' : '', barTop + peH/2);
        if (keH > 14) labelStyle(getC('#ff8c42','#e65100'), 'KE', this.showEnergyVals ? ke.toFixed(3)+'J' : '', barTop + peH + keH/2);

        // ME total label below bar
        const meY = panelTop + panelH - 62;
        ctx.fillStyle = getC('#5cbf79', '#2e7d32');
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.showEnergyVals ? ('ME = ' + me.toFixed(3) + ' J') : 'Total ME', midX, meY);

        // Separator line
        ctx.strokeStyle = getC('rgba(229,204,143,0.15)', 'rgba(11,95,119,0.15)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 8, meY + 10);
        ctx.lineTo(px + panelW - 8, meY + 10);
        ctx.stroke();

        // Height readout
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('h = ' + h.toFixed(3) + ' m', midX, meY + 24);
        if (this.showEnergyVals) ctx.fillText('v = ' + v.toFixed(3) + ' m/s', midX, meY + 37);
        ctx.fillText('t = ' + this.measuredTime.toFixed(4) + ' s', midX, this.showEnergyVals ? meY + 50 : meY + 37);
    }
}


// ==================== ENERGY BAR CHART ====================
class EnergyBarChart {
    constructor(canvasId, hideValues = false) {
        this.hideValues = hideValues;
        this.canvas = el(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = rect.width;
        this.H = rect.height;
        this.draw();
    }

    setData(trials) { this.data = trials; this.draw(); }
    clear() { this.data = []; this.draw(); }

    draw() {
        const ctx = this.ctx;
        const pad = { left: 55, right: 20, top: 25, bottom: 45 };
        const pW = this.W - pad.left - pad.right;
        const pH = this.H - pad.top - pad.bottom;
        ctx.clearRect(0, 0, this.W * 2, this.H * 2);

        if (this.data.length === 0) {
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = '13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Record data points to see the energy bar chart', this.W / 2, this.H / 2);
            return;
        }

        let maxE = 0;
        for (const t of this.data) { maxE = Math.max(maxE, t.me * 1.15); }
        if (maxE < 0.01) maxE = 1;

        // Grid
        ctx.strokeStyle = getC('rgba(229,204,143,0.1)', 'rgba(11,95,119,0.1)');
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = pad.top + (i / 5) * pH;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pW, y); ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = getC('rgba(229,204,143,0.4)', 'rgba(11,95,119,0.4)');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + pH);
        ctx.lineTo(pad.left + pW, pad.top + pH);
        ctx.stroke();

        // Y-axis labels
        if (!this.hideValues) {
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i <= 5; i++) {
                const val = maxE - (i / 5) * maxE;
                ctx.fillText(val.toFixed(2), pad.left - 6, pad.top + (i / 5) * pH);
            }
        }

        // Y axis title
        ctx.save();
        ctx.translate(14, pad.top + pH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Energy (J)', 0, 0);
        ctx.restore();

        // Bars
        const n = this.data.length;
        const groupW = pW / Math.max(n, 1);
        const barW = Math.min(groupW * 0.25, 28);
        const gap = 3;

        for (let i = 0; i < n; i++) {
            const t = this.data[i];
            const gx = pad.left + i * groupW + groupW / 2;

            const drawBar = (val, offset, color) => {
                const bH = (val / maxE) * pH;
                const x = gx + offset - barW / 2;
                const y = pad.top + pH - bH;
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(x, y, barW, bH);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, barW, bH);
                // Value label
                if (!this.hideValues && bH > 14) {
                    ctx.fillStyle = getC('#eef2f9', '#fff');
                    ctx.font = 'bold 8px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(val.toFixed(2), x + barW / 2, y + 10);
                }
            };

            drawBar(t.pe, -(barW + gap), getC('#4a9eff', '#2979ff'));
            drawBar(t.ke, 0, getC('#ff8c42', '#e65100'));
            drawBar(t.me, barW + gap, getC('#5cbf79', '#2e7d32'));

            // Point label
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(t.label, gx, pad.top + pH + 16);
        }

        // Legend
        const lx = pad.left + pW - 140;
        const ly = pad.top + 8;
        const drawLeg = (x, y, color, text) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 10, 10);
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(text, x + 14, y + 9);
        };
        drawLeg(lx, ly, getC('#4a9eff', '#2979ff'), 'PE');
        drawLeg(lx + 40, ly, getC('#ff8c42', '#e65100'), 'KE');
        drawLeg(lx + 80, ly, getC('#5cbf79', '#2e7d32'), 'ME');
    }
}

// ==================== ENERGY vs HEIGHT LINE GRAPH ====================
class EnergyLineGraph {
    constructor(canvasId, hideValues = false) {
        this.hideValues = hideValues;
        this.canvas = el(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = rect.width;
        this.H = rect.height;
        this.draw();
    }

    setData(trials) { this.data = [...trials].sort((a, b) => a.height - b.height); this.draw(); }
    clear() { this.data = []; this.draw(); }

    draw() {
        const ctx = this.ctx;
        const pad = { left: 55, right: 20, top: 25, bottom: 45 };
        const pW = this.W - pad.left - pad.right;
        const pH = this.H - pad.top - pad.bottom;
        ctx.clearRect(0, 0, this.W * 2, this.H * 2);

        if (this.data.length === 0) {
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = '13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Record data points to see energy vs height', this.W / 2, this.H / 2);
            return;
        }

        let maxH = 0, maxE = 0;
        for (const t of this.data) {
            maxH = Math.max(maxH, t.height * 1.1);
            maxE = Math.max(maxE, t.me * 1.15);
        }
        if (maxH < 0.1) maxH = 1;
        if (maxE < 0.01) maxE = 1;

        const toX = h => pad.left + (h / maxH) * pW;
        const toY = e => pad.top + pH - (e / maxE) * pH;

        // Grid
        ctx.strokeStyle = getC('rgba(229,204,143,0.1)', 'rgba(11,95,119,0.1)');
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = pad.top + (i / 5) * pH;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pW, y); ctx.stroke();
            const x = pad.left + (i / 5) * pW;
            ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + pH); ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = getC('rgba(229,204,143,0.4)', 'rgba(11,95,119,0.4)');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + pH);
        ctx.lineTo(pad.left + pW, pad.top + pH);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = getC('#a9b2c3', '#4b6570');
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Height (m)', pad.left + pW / 2, this.H - 5);

        ctx.save();
        ctx.translate(14, pad.top + pH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Energy (J)', 0, 0);
        ctx.restore();

        // Tick labels
        if (!this.hideValues) {
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            for (let i = 0; i <= 5; i++) {
                ctx.fillText(((i / 5) * maxH).toFixed(2), pad.left + (i / 5) * pW, pad.top + pH + 6);
            }
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i <= 5; i++) {
                ctx.fillText((maxE - (i / 5) * maxE).toFixed(2), pad.left - 6, pad.top + (i / 5) * pH);
            }
        }

        // Draw lines
        const drawLine = (key, color) => {
            if (this.data.length < 2) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 0; i < this.data.length; i++) {
                const px = toX(this.data[i].height);
                const py = toY(this.data[i][key]);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        };

        drawLine('pe', getC('#4a9eff', '#2979ff'));
        drawLine('ke', getC('#ff8c42', '#e65100'));
        drawLine('me', getC('#5cbf79', '#2e7d32'));

        // Data points
        const drawPts = (key, color) => {
            for (const t of this.data) {
                const px = toX(t.height);
                const py = toY(t[key]);
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = getC('#eef2f9', '#fff');
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        };

        drawPts('pe', getC('#4a9eff', '#2979ff'));
        drawPts('ke', getC('#ff8c42', '#e65100'));
        drawPts('me', getC('#5cbf79', '#2e7d32'));

        // Legend
        const lx = pad.left + 10;
        const ly = pad.top + 8;
        const drawLeg = (x, y, color, text) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 10, 10);
            ctx.fillStyle = getC('#a9b2c3', '#4b6570');
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(text, x + 14, y + 9);
        };
        drawLeg(lx, ly, getC('#4a9eff', '#2979ff'), 'PE');
        drawLeg(lx + 40, ly, getC('#ff8c42', '#e65100'), 'KE');
        drawLeg(lx + 80, ly, getC('#5cbf79', '#2e7d32'), 'ME');
    }
}

// Old TeacherDemo removed entirely.

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // --- Lab Mode ---
    const labSim = new FreeFallSim('labCanvas');
    labSim.showEnergy = true;
    labSim.showEnergyVals = false;
    const labBarChart = new EnergyBarChart('energyBarChart', true);
    const labLineGraph = new EnergyLineGraph('energyLineGraph', true);

    // Controls
    el('massSlider').addEventListener('input', e => {
        const m = parseFloat(e.target.value);
        labSim.setMass(m);
        el('massDisplay').textContent = m.toFixed(3) + ' kg';
    });

    el('topGateSlider').addEventListener('input', e => {
        const h = parseFloat(e.target.value);
        labSim.setTopGate(h);
        el('topGateDisplay').textContent = h.toFixed(3) + ' m';
        // Ensure bottom gate slider is below
        const bSlider = el('bottomGateSlider');
        bSlider.max = (h - 0.010).toFixed(3);
        if (parseFloat(bSlider.value) >= h) {
            bSlider.value = Math.max(0, h - 0.050).toFixed(3);
            bSlider.dispatchEvent(new Event('input'));
        }
    });

    el('bottomGateSlider').addEventListener('input', e => {
        const h = parseFloat(e.target.value);
        labSim.setBottomGate(h);
        el('bottomGateDisplay').textContent = h.toFixed(3) + ' m';
        labSim.updateReadouts();
    });

    el('dropBtn').addEventListener('click', () => {
        labSim.drop();
        el('recordBtn').disabled = false;
    });

    el('recordBtn').addEventListener('click', () => {
        const trial = labSim.recordTrial();
        if (!trial) return;
        const row = el('trial' + trial.label);
        if (row) {
            row.classList.add('recorded');
            const cells = row.querySelectorAll('td');
            cells[1].textContent = trial.height.toFixed(3);
            cells[2].textContent = trial.time.toFixed(4);
        }
        labBarChart.setData(labSim.trials);
        labLineGraph.setData(labSim.trials);
        labSim.updateReadouts();
        el('recordBtn').disabled = true;

        if (labSim.trials.length >= 6) {
            el('labHint').textContent = '🎉 All 6 points recorded! Now, calculate the velocity and energies for each point.';
        }
    });

    el('resetLabBtn').addEventListener('click', () => {
        labSim.resetExperiment();
        labBarChart.clear();
        labLineGraph.clear();
        document.querySelectorAll('#dataTable tbody tr').forEach(r => {
            r.classList.remove('recorded');
            const cells = r.querySelectorAll('td');
            for (let i = 1; i < cells.length; i++) cells[i].textContent = '—';
        });
        labSim.updateReadouts();
        el('recordBtn').disabled = true;
        el('labHint').textContent = 'Move the lower photogate and drop the ball to build your data table.';
    });

    // --- Teacher Mode: LAZY INIT ---
    // The teacher canvases are inside a display:none div on page load.
    // We must wait until the tab is visible before measuring canvas dimensions.
    let teacherInited = false;
    let teacherSim, teacherBar, teacherLine;
    let airResistanceActive = false;

    function initTeacher() {
        if (teacherInited) return;
        teacherInited = true;

        teacherSim = new FreeFallSim('teacherCanvas', 'teacher');
        teacherSim.showEnergy = true;
        teacherBar = new EnergyBarChart('teacherBarChart');
        teacherLine = new EnergyLineGraph('teacherLineGraph');

        el('teacherMassSlider').addEventListener('input', e => {
            const m = parseFloat(e.target.value);
            teacherSim.setMass(m);
            el('teacherMassDisplay').textContent = m.toFixed(3) + ' kg';
        });

        el('teacherHeightSlider').addEventListener('input', e => {
            const h = parseFloat(e.target.value);
            teacherSim.setTopGate(h);
            el('teacherHeightDisplay').textContent = h.toFixed(3) + ' m';
            const bSlider = el('teacherBottomGateSlider');
            bSlider.max = (h - 0.010).toFixed(3);
            if (parseFloat(bSlider.value) >= h) {
                bSlider.value = Math.max(0, h - 0.050).toFixed(3);
                bSlider.dispatchEvent(new Event('input'));
            }
        });

        el('teacherBottomGateSlider').addEventListener('input', e => {
            const h = parseFloat(e.target.value);
            teacherSim.setBottomGate(h);
            el('teacherBottomGateDisplay').textContent = h.toFixed(3) + ' m';
            teacherSim.updateReadouts();
        });

        el('airResistToggle').addEventListener('change', e => {
            airResistanceActive = e.target.checked;
        });

        el('teacherDropBtn').addEventListener('click', () => {
            teacherSim.drop();
            el('teacherRecordBtn').disabled = false;
        });

        el('teacherRecordBtn').addEventListener('click', () => {
            const trial = teacherSim.recordTrial();
            if (!trial) return;

            // Apply air resistance modifier if checked
            if (airResistanceActive) {
                const fallDist = teacherSim.topGateH - trial.height;
                if (fallDist > 0) {
                    trial.velocity *= (1 - 0.04 * fallDist);
                    trial.ke = 0.5 * teacherSim.mass * trial.velocity * trial.velocity;
                    trial.me = trial.pe + trial.ke;
                }
            }

            const row = el('tTrial' + trial.label);
            if (row) {
                row.classList.add('recorded');
                const cells = row.querySelectorAll('td');
                cells[1].textContent = trial.height.toFixed(3);
                cells[2].textContent = trial.velocity.toFixed(3);
                cells[3].textContent = trial.pe.toFixed(3);
                cells[4].textContent = trial.ke.toFixed(3);
                cells[5].textContent = trial.me.toFixed(3);
            }
            teacherBar.setData(teacherSim.trials);
            teacherLine.setData(teacherSim.trials);
            teacherSim.updateReadouts();
            el('teacherRecordBtn').disabled = true;

            if (teacherSim.trials.length >= 6) {
                if (airResistanceActive) {
                    el('annotationText').innerHTML = '⚠️ With air resistance, ME <strong>decreases</strong> as the ball falls. This is why ME is NOT constant — a non-conservative force is doing work.';
                } else {
                    el('annotationText').innerHTML = '✅ <strong>ME is constant</strong> across all 6 points! PE converts to KE as the ball falls, confirming conservation of mechanical energy.';
                }
            }
        });

        el('teacherResetLabBtn').addEventListener('click', () => {
            teacherSim.resetExperiment();
            teacherBar.clear();
            teacherLine.clear();
            document.querySelectorAll('#teacherDataTable tbody tr').forEach(r => {
                r.classList.remove('recorded');
                const cells = r.querySelectorAll('td');
                for (let i = 1; i < cells.length; i++) cells[i].textContent = '—';
            });
            teacherSim.updateReadouts();
            el('teacherRecordBtn').disabled = true;
            el('annotationText').innerHTML = 'Move the lower photogate and drop the ball to build your demonstrative data table.';
        });
    }

    // --- Mode Tab Switching ---
    document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            el(mode + '-mode').classList.add('active');

            if (mode === 'teacher') {
                initTeacher(); // now the panel is visible — canvas dimensions are correct
                teacherSim.draw();
                teacherBar.draw();
                teacherLine.draw();
            }
        });
    });

    // --- Tab Navigation ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabGroup = btn.closest('.panel');
            tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            tabGroup.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.tab + '-tab';
            const tabContent = el(tabId);
            if (tabContent) tabContent.classList.add('active');
        });
    });

    // Initial state
    labSim.updateReadouts();
});
