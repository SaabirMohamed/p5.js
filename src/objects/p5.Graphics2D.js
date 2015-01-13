
define(function(require) {

  var p5 = require('core');
  var canvas = require('canvas');
  var constants = require('constants');
  var filters = require('filters');

  var styleEmpty = 'rgba(0,0,0,0)';
  // var alphaThreshold = 0.00125; // minimum visible
  

  p5.Graphics2D = function(elt, pInst, isMainCanvas) {
    p5.Graphics.call(this, constants.P2D, elt, pInst, {}, isMainCanvas);
    // apply some defaults
    this.drawingContext.fillStyle = '#FFFFFF';
    this.drawingContext.strokeStyle = '#000000';
    this.drawingContext.lineCap = constants.ROUND;
    this._pInst._setProperty('_graphics', this);
    return this;
  };

  p5.Graphics2D.prototype = Object.create(p5.Graphics.prototype);

  //////////////////////////////////////////////
  // COLOR | Setting
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.background = function() {
    var curFill = this.drawingContext.fillStyle;
    // create background rect
    this.drawingContext.fillStyle =
      p5.Color._getCanvasColor.apply(this._pInst, arguments);
    this.drawingContext.fillRect(0, 0, this.width, this.height);
    // reset fill
    this.drawingContext.fillStyle = curFill;
  };
  
  p5.Graphics2D.prototype.clear = function() {
    this.drawingContext.clearRect(0, 0, this._pInst.width, this._pInst.height);
  };

  p5.Graphics2D.prototype.fill = function() {
    this.drawingContext.fillStyle =
      p5.Color._getCanvasColor.apply(this._pInst, arguments);
  };

  p5.Graphics2D.prototype.stroke = function() {
    this.drawingContext.strokeStyle =
      p5.Color._getCanvasColor.apply(this._pInst, arguments);
  };

  //////////////////////////////////////////////
  // IMAGE | Loading & Displaying
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.image = function(img, x, y, w, h) {
    // tint the image if there is a tint
    if (this._pInst._tint) {
      this.drawingContext.drawImage(getTintedImageCanvas(this._pInst._tint,
        img), x, y, w, h);
    } else {
      var frame = img.canvas || img.elt; // may use vid src
      this.drawingContext.drawImage(frame, x, y, w, h);
    }
  };

  /**
   * Apply the current tint color to the input image, return the resulting
   * canvas.
   *
   * @param {p5.Image} The image to be tinted
   * @return {canvas} The resulting tinted canvas
   */
  function getTintedImageCanvas(tint, img) {
    if (!img.canvas) {
      return img;
    }
    var pixels = filters._toPixels(img.canvas);
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = img.canvas.width;
    tmpCanvas.height = img.canvas.height;
    var tmpCtx = tmpCanvas.getContext('2d');
    var id = tmpCtx.createImageData(img.canvas.width, img.canvas.height);
    var newPixels = id.data;

    for(var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i];
      var g = pixels[i+1];
      var b = pixels[i+2];
      var a = pixels[i+3];

      newPixels[i] = r*tint[0]/255;
      newPixels[i+1] = g*tint[1]/255;
      newPixels[i+2] = b*tint[2]/255;
      newPixels[i+3] = a*tint[3]/255;
    }

    tmpCtx.putImageData(id, 0, 0);
    return tmpCanvas;
  }


  //////////////////////////////////////////////
  // IMAGE | Pixels
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.blend = function() {
    var currBlend = this.drawingContext.globalCompositeOperation;
    var blendMode = arguments[arguments.length - 1];
    var copyArgs = Array.prototype.slice.call(
      arguments,
      0,
      arguments.length - 1
    );

    this.drawingContext.globalCompositeOperation = blendMode;
    if (this._pInst) {
      this._pInst.copy.apply(this._pInst, copyArgs);
    } else {
      this.copy.apply(this, copyArgs);
    }
    this.drawingContext.globalCompositeOperation = currBlend;
  };

  p5.Graphics2D.prototype.copy = function() {
    var srcImage, sx, sy, sw, sh, dx, dy, dw, dh;
    if(arguments.length === 9){
      srcImage = arguments[0];
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else if(arguments.length === 8){
      sx = arguments[0];
      sy = arguments[1];
      sw = arguments[2];
      sh = arguments[3];
      dx = arguments[4];
      dy = arguments[5];
      dw = arguments[6];
      dh = arguments[7];

      srcImage = this;
    } else {
      throw new Error('Signature not supported');
    }

    /// use s scale factor to deal with pixel density
    var s = srcImage.canvas.width / srcImage.width;
    this.drawingContext.drawImage(srcImage.canvas,
      s*sx, s*sy, s*sw, s*sh, dx, dy, dw, dh
    );
  };

  p5.Graphics2D.prototype.get = function(x, y, w, h) {
    if(x > this.width || y > this.height || x < 0 || y < 0){
      return [0, 0, 0, 255];
    } else if (x === undefined && y === undefined &&
      w === undefined && h === undefined){
      x = 0;
      y = 0;
      w = this.width;
      h = this.height;
    } else if (w === undefined && h === undefined) {
      w = 1;
      h = 1;
    }

    var imageData = this.drawingContext.getImageData(x, y, w, h);
    var data = imageData.data;

    if (w === 1 && h === 1){
      var pixels = [];
      
      for (var i = 0; i < data.length; i += 4) {
        pixels.push(data[i], data[i+1], data[i+2], data[i+3]);
      }
      
      return pixels;
    } else {
      //auto constrain the width and height to
      //dimensions of the source image
      w = Math.min(w, this.width);
      h = Math.min(h, this.height);

      var region = new p5.Image(w, h);
      region.drawingContext.putImageData(imageData, 0, 0, 0, 0, w, h);

      return region;
    }
  };

  p5.Graphics2D.prototype.loadPixels = function() {
    var imageData = this.drawingContext.getImageData(
      0,
      0,
      this.width,
      this.height);
    this._setProperty('imageData', imageData);
    if (this._pInst) {
      this._pInst._setProperty('pixels', imageData.data);
    } else {
      this._setProperty('pixels', imageData.data);
    }
  };

  p5.Graphics2D.prototype.set = function (x, y, imgOrCol) {
    var pix = this._pInst ? this._pInst.pixels : this.pixels;
    if (imgOrCol instanceof p5.Image) {
      this.drawingContext.drawImage(imgOrCol.canvas, x, y);
      if (this._pInst) {
        this._pInst.loadPixels.call(this._pInst);
      } else {
        this.loadPixels.call(this);
      }
    } else {
      var idx = 4*(y * this.width + x);
      if (!this.imageData) {
        if (this._pInst) {
          this._pInst.loadPixels.call(this._pInst);
        } else {
          this.loadPixels.call(this);
        }
      }
      if (typeof imgOrCol === 'number') {
        if (idx < pix.length) {
          pix[idx] = imgOrCol;
          pix[idx+1] = imgOrCol;
          pix[idx+2] = imgOrCol;
          pix[idx+3] = 255;
          //this.updatePixels.call(this);
        }
      }
      else if (imgOrCol instanceof Array) {
        if (imgOrCol.length < 4) {
          throw new Error('pixel array must be of the form [R, G, B, A]');
        }
        if (idx < pix.length) {
          pix[idx] = imgOrCol[0];
          pix[idx+1] = imgOrCol[1];
          pix[idx+2] = imgOrCol[2];
          pix[idx+3] = imgOrCol[3];
          //this.updatePixels.call(this);
        }
      } else if (imgOrCol instanceof p5.Color) {
        if (idx < pix.length) {
          pix[idx] = imgOrCol.rgba[0];
          pix[idx+1] = imgOrCol.rgba[1];
          pix[idx+2] = imgOrCol.rgba[2];
          pix[idx+3] = imgOrCol.rgba[3];
          //this.updatePixels.call(this);
        }
      }
    }
  };

  p5.Graphics2D.prototype.updatePixels = function (x, y, w, h) {
    if (x === undefined &&
      y === undefined &&
      w === undefined &&
      h === undefined) {
      x = 0;
      y = 0;
      w = this.width;
      h = this.height;
    }
    this.drawingContext.putImageData(this.imageData, x, y, 0, 0, w, h);
  };

  //////////////////////////////////////////////
  // SHAPE | 2D Primitives
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.arc = function(x, y, w, h, start, stop, mode) {
    var vals = canvas.arcModeAdjust(x, y, w, h, this._pInst._ellipseMode);
    var radius = (vals.h > vals.w) ? vals.h / 2 : vals.w / 2,
      //scale the arc if it is oblong
      xScale = (vals.h > vals.w) ? vals.w / vals.h : 1,
      yScale = (vals.h > vals.w) ? 1 : vals.h / vals.w;
    this.drawingContext.save();
    this.drawingContext.scale(xScale, yScale);
    this.drawingContext.beginPath();
    this.drawingContext.arc(vals.x, vals.y, radius, start, stop);
    if (this._pInst._doStroke) {
      this.drawingContext.stroke();
    }
    if (mode === constants.CHORD || mode === constants.OPEN) {
      this.drawingContext.closePath();
    } else if (mode === constants.PIE || mode === undefined) {
      this.drawingContext.lineTo(vals.x, vals.y);
      this.drawingContext.closePath();
    }
    if (this._pInst._doFill) {
      this.drawingContext.fill();
    }
    if(this._pInst._doStroke && mode !== constants.OPEN && mode !== undefined) {
      // final stroke must be after fill so the fill does not
      // cover part of the line
      this.drawingContext.stroke();
    }
    this.drawingContext.restore();
  };

  p5.Graphics2D.prototype.ellipse = function(x, y, w, h) {
    var vals = canvas.modeAdjust(x, y, w, h, this._pInst._ellipseMode);
    this.drawingContext.beginPath();
    if (w === h) {
      this.drawingContext.arc(vals.x+vals.w/2, vals.y+vals.w/2, vals.w/2,
        0, 2*Math.PI, false);
    } else {
      var kappa = 0.5522848,
        ox = (vals.w / 2) * kappa, // control point offset horizontal
        oy = (vals.h / 2) * kappa, // control point offset vertical
        xe = vals.x + vals.w,      // x-end
        ye = vals.y + vals.h,      // y-end
        xm = vals.x + vals.w / 2,  // x-middle
        ym = vals.y + vals.h / 2;  // y-middle
      this.drawingContext.moveTo(vals.x, ym);
      this.drawingContext.bezierCurveTo(
        vals.x,
        ym - oy,
        xm - ox,
        vals.y,
        xm,
        vals.y
      );
      this.drawingContext.bezierCurveTo(
        xm + ox,
        vals.y,
        xe,
        ym - oy,
        xe,
        ym
      );
      this.drawingContext.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
      this.drawingContext.bezierCurveTo(
        xm - ox,
        ye,
        vals.x,
        ym + oy,
        vals.x,
        ym
      );
      this.drawingContext.closePath();
    }
    if (this._pInst._doFill) {
      this.drawingContext.fill();
    }
    if (this._pInst._doStroke) {
      this.drawingContext.stroke();
    }
  };

  p5.Graphics2D.prototype.line = function(x1, y1, x2, y2) {
    if (!this._pInst._doStroke) {
      return this;
    } else if(this.drawingContext.strokeStyle === styleEmpty){
      return this;
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(x1, y1);
    this.drawingContext.lineTo(x2, y2);
    this.drawingContext.stroke();
    return this;
  };

  p5.Graphics2D.prototype.point = function(x, y) {
    var s = this.drawingContext.strokeStyle;
    var f = this.drawingContext.fillStyle;
    if (!this._pInst._doStroke) {
      return this;
    } else if(this.drawingContext.strokeStyle === styleEmpty) {
      return this;
    }
    x = Math.round(x);
    y = Math.round(y);
    this.drawingContext.fillStyle = s;
    if (this.drawingContext.lineWidth > 1) {
      this.drawingContext.beginPath();
      this.drawingContext.arc(
        x,
        y,
        this.drawingContext.lineWidth / 2,
        0,
        constants.TWO_PI,
        false
      );
      this.drawingContext.fill();
    } else {
      this.drawingContext.fillRect(x, y, 1, 1);
    }
    this.drawingContext.fillStyle = f;
  };

  p5.Graphics2D.prototype.quad =
    function(x1, y1, x2, y2, x3, y3, x4, y4) {
    var doFill = this._pInst._doFill, doStroke = this._pInst._doStroke;
    if (doFill && !doStroke) {
      if(this.drawingContext.fillStyle === styleEmpty) {
        return this;
      }
    } else if (!doFill && doStroke) {
      if(this.drawingContext.strokeStyle === styleEmpty) {
        return this;
      }
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(x1, y1);
    this.drawingContext.lineTo(x2, y2);
    this.drawingContext.lineTo(x3, y3);
    this.drawingContext.lineTo(x4, y4);
    this.drawingContext.closePath();
    if (doFill) {
      this.drawingContext.fill();
    }
    if (doStroke) {
      this.drawingContext.stroke();
    }
    return this;
  };

  p5.Graphics2D.prototype.rect = function(a, b, c, d) {
    var doFill = this._pInst._doFill, doStroke = this._pInst._doStroke;
    if (doFill && !doStroke) {
      if(this.drawingContext.fillStyle === styleEmpty) {
        return this;
      }
    } else if (!doFill && doStroke) {
      if(this.drawingContext.strokeStyle === styleEmpty) {
        return this;
      }
    }
    var vals = canvas.modeAdjust(a, b, c, d, this._pInst._rectMode);
    this.drawingContext.beginPath();
    this.drawingContext.rect(vals.x, vals.y, vals.w, vals.h);
    if (doFill) {
      this.drawingContext.fill();
    }
    if (doStroke) {
      this.drawingContext.stroke();
    }
    return this;
  };

  p5.Graphics2D.prototype.triangle = function(x1, y1, x2, y2, x3, y3) {
    var doFill = this._pInst._doFill, doStroke = this._pInst._doStroke;
    if (doFill && !doStroke) {
      if(this.drawingContext.fillStyle === styleEmpty) {
        return this;
      }
    } else if (!doFill && doStroke) {
      if(this.drawingContext.strokeStyle === styleEmpty) {
        return this;
      }
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(x1, y1);
    this.drawingContext.lineTo(x2, y2);
    this.drawingContext.lineTo(x3, y3);
    this.drawingContext.closePath();
    if (doFill) {
      this.drawingContext.fill();
    }
    if (doStroke) {
      this.drawingContext.stroke();
    }
  };

  //////////////////////////////////////////////
  // SHAPE | Attributes
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.noSmooth = function() {
    this.drawingContext.mozImageSmoothingEnabled = false;
    this.drawingContext.webkitImageSmoothingEnabled = false;
  };

  p5.Graphics2D.prototype.smooth = function() {
    this.drawingContext.mozImageSmoothingEnabled = true;
    this.drawingContext.webkitImageSmoothingEnabled = true;
  };

  p5.Graphics2D.prototype.strokeCap = function(cap) {
    this.drawingContext.lineCap=cap;
  };

  p5.Graphics2D.prototype.strokeJoin = function(join) {
    this.drawingContext.lineJoin = join;
  };

  p5.Graphics2D.prototype.strokeWeight = function(w) {
    if (typeof w === 'undefined' || w === 0) {
      // hack because lineWidth 0 doesn't work
      this.drawingContext.lineWidth = 0.0001;
    } else {
      this.drawingContext.lineWidth = w;
    }
    return this;
  };

  //////////////////////////////////////////////
  // SHAPE | Curves
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.bezier = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    this._pInst.beginShape();
    this._pInst.vertex(x1, y1);
    this._pInst.bezierVertex(x2, y2, x3, y3, x4, y4);
    this._pInst.endShape();
    this._pInst.stroke();
  };

  p5.Graphics2D.prototype.curve = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    this._pInst.beginShape();
    this._pInst.curveVertex(x1, y1);
    this._pInst.curveVertex(x2, y2);
    this._pInst.curveVertex(x3, y3);
    this._pInst.curveVertex(x4, y4);
    this._pInst.endShape();
    this._pInst.stroke();
  };

  //////////////////////////////////////////////
  // SHAPE | Vertex
  //////////////////////////////////////////////


  /* 
   * Helper methods
   */
  p5.Graphics2D.prototype._doFillStrokeClose = function() {
    if (this._pInst._doFill) {
      this.drawingContext.fill();
    }
    if (this._pInst._doStroke) {
      this.drawingContext.stroke();
    }
    this.drawingContext.closePath();
  };

  p5.Graphics2D.prototype._getFill = function() {
    return this.drawingContext.fillStyle;
  };

  p5.Graphics.prototype._getStroke = function() {
    return this.drawingContext.strokeStyle;
  };

  /*
   * Actual methods
   */
  p5.Graphics2D.prototype.endShape = function(mode, vertices, isCurve,
    isBezier, isQuadratic, isContour, shapeKind) {

    var v;
    var i, j;
    var numVerts = vertices.length;

    // curveVertex
    if ( isCurve && (shapeKind === constants.POLYGON || shapeKind === null) ) {
      if (numVerts > 3) {
        var b = [],
            s = 1 - this._curveTightness;
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(vertices[1][0], vertices[1][1]);
          /*
          * Matrix to convert from Catmull-Rom to cubic Bezier
          * where t = curTightness
          * |0         1          0         0       |
          * |(t-1)/6   1          (1-t)/6   0       |
          * |0         (1-t)/6    1         (t-1)/6 |
          * |0         0          0         0       |
          */
        for (i = 1; (i+2) < numVerts; i++) {
          v = vertices[i];
          b[0] = [v[0], v[1]];
          b[1] = [v[0] + (s * vertices[i+1][0] - s * vertices[i-1][0]) / 6,
                 v[1] + (s * vertices[i+1][1] - s * vertices[i-1][1]) / 6];
          b[2] = [vertices[i+1][0] + (s*vertices[i][0] - s*vertices[i+2][0])/6,
                 vertices[i+1][1] + (s*vertices[i][1] - s*vertices[i+2][1])/6];
          b[3] = [vertices[i+1][0], vertices[i+1][1]];
          this.drawingContext.bezierCurveTo(b[1][0], b[1][1],
            b[2][0], b[2][1], b[3][0], b[3][1]);
        }
        if (mode === constants.CLOSE) {
          this.drawingContext.lineTo(vertices[i+1][0], vertices[i+1][1]);
        }
        this._doFillStrokeClose();
      }
    }

    // bezierVertex
    else if (isBezier &&
      (shapeKind === constants.POLYGON || shapeKind === null) ) {
      this.drawingContext.beginPath();
      for (i = 0; i < numVerts; i++) {
        if (vertices[i].isVert) { //if it is a vertex move to the position
          if (vertices[i].moveTo) {
            this.drawingContext.moveTo(vertices[i][0], vertices[i][1]);
          } else {
            this.drawingContext.lineTo(vertices[i][0], vertices[i][1]);
          }
        } else { //otherwise continue drawing bezier
          this.drawingContext.bezierCurveTo(vertices[i][0], vertices[i][1],
            vertices[i][2], vertices[i][3], vertices[i][4], vertices[i][5]);
        }
      }
      this._doFillStrokeClose();
    } else if (isQuadratic &&
      (shapeKind === constants.POLYGON || shapeKind === null)) {
      this.drawingContext.beginPath();
      for (i = 0; i < numVerts; i++) {
        if (vertices[i].isVert) {
          if (vertices[i].moveTo) {
            this.drawingContext.moveTo([0], vertices[i][1]);
          } else {
            this.drawingContext.lineTo(vertices[i][0], vertices[i][1]);
          }
        } else {
          this.drawingContext.quadraticCurveTo(vertices[i][0],
            vertices[i][1], vertices[i][2], vertices[i][3]);
        }
      }
      this._doFillStrokeClose();
    }
    // render the vertices provided
    else {
      if (shapeKind === constants.POINTS) {
        for (i = 0; i < numVerts; i++) {
          v = vertices[i];
          if (this._pInst._doStroke) {
            this.stroke(v[6]);
          }
          this.point(v[0], v[1]);
        }
      } else if (shapeKind === constants.LINES) {
        for (i = 0; (i + 1) < numVerts; i+=2) {
          v = vertices[i];
          if (this._pInst._doStroke) {
            this.stroke(vertices[i+1][6]);
          }
          this.line(v[0], v[1], vertices[i+1][0], vertices[i+1][1]);
        }
      } else if (shapeKind === constants.TRIANGLES) {
        for (i = 0; (i + 2) < numVerts; i+=3) {
          v = vertices[i];
          this.drawingContext.beginPath();
          this.drawingContext.moveTo(v[0], v[1]);
          this.drawingContext.lineTo(vertices[i+1][0], vertices[i+1][1]);
          this.drawingContext.lineTo(vertices[i+2][0], vertices[i+2][1]);
          this.drawingContext.lineTo(v[0], v[1]);

          if (this._pInst._doFill) {
            this.fill(vertices[i+2][5]);
            this.drawingContext.fill();
          }
          if (this._pInst._doStroke) {
            this.stroke(vertices[i+2][6]);
            this.drawingContext.stroke();
          }

          this.drawingContext.closePath();
        }
      } else if (shapeKind === constants.TRIANGLE_STRIP) {
        for (i = 0; (i+1) < numVerts; i++) {
          v = vertices[i];
          this.drawingContext.beginPath();
          this.drawingContext.moveTo(vertices[i+1][0], vertices[i+1][1]);
          this.drawingContext.lineTo(v[0], v[1]);

          if (this._pInst._doStroke) {
            this.stroke(vertices[i+1][6]);
          }
          if (this._pInst._doFill) {
            this.fill(vertices[i+1][5]);
          }

          if (i + 2 < numVerts) {
            this.drawingContext.lineTo(vertices[i+2][0], vertices[i+2][1]);
            if (this._pInst._doStroke) {
              this.stroke(vertices[i+2][6]);
            }
            if (this._pInst._doFill) {
              this.fill(vertices[i+2][5]);
            }
          }
          this._doFillStrokeClose();
        }
      } else if (shapeKind === constants.TRIANGLE_FAN) {
        if (numVerts > 2) {
          this.drawingContext.beginPath();
          this.drawingContext.moveTo(vertices[0][0], vertices[0][1]);
          this.drawingContext.lineTo(vertices[1][0], vertices[1][1]);
          this.drawingContext.lineTo(vertices[2][0], vertices[2][1]);

          if (this._pInst._doFill) {
            this.fill(vertices[2][5]);
          }
          if (this._pInst._doStroke) {
            this.stroke(vertices[2][6]);
          }
          this._doFillStrokeClose();

          for (i = 3; i < numVerts; i++) {
            v = vertices[i];
            this.drawingContext.beginPath();
            this.drawingContext.moveTo(vertices[0][0], vertices[0][1]);
            this.drawingContext.lineTo(vertices[i-1][0], vertices[i-1][1]);
            this.drawingContext.lineTo(v[0], v[1]);

            if (this._pInst._doFill) {
              this.fill(v[5]);
            }
            if (this._pInst._doStroke) {
              this.stroke(v[6]);
            }
            this._doFillStrokeClose();
          }
        }
      } else if (shapeKind === constants.QUADS) {
        for (i = 0; (i + 3) < numVerts; i+=4) {
          v = vertices[i];
          this.drawingContext.beginPath();
          this.drawingContext.moveTo(v[0], v[1]);
          for (j = 1; j < 4; j++) {
            this.drawingContext.lineTo(vertices[i+j][0], vertices[i+j][1]);
          }
          this.drawingContext.lineTo(v[0], v[1]);

          if (this._pInst._doFill) {
            this.fill(vertices[i+3][5]);
          }
          if (this._pInst._doStroke) {
            this.stroke(vertices[i+3][6]);
          }

          this._doFillStrokeClose();
        }
      } else if (shapeKind === constants.QUAD_STRIP) {
        if (numVerts > 3) {
          for (i = 0; (i+1) < numVerts; i+=2) {
            v = vertices[i];
            this.drawingContext.beginPath();
            if (i+3 < numVerts) {
              this.drawingContext.moveTo(vertices[i+2][0], vertices[i+2][1]);
              this.drawingContext.lineTo(v[0], v[1]);
              this.drawingContext.lineTo(vertices[i+1][0], vertices[i+1][1]);
              this.drawingContext.lineTo(vertices[i+3][0], vertices[i+3][1]);

              if (this._pInst._doFill) {
                this.fill(vertices[i+3][5]);
              }
              if (this._pInst._doStroke) {
                this.stroke(vertices[i+3][6]);
              }
            } else {
              this.drawingContext.moveTo(v[0], v[1]);
              this.drawingContext.lineTo(vertices[i+1][0], vertices[i+1][1]);
            }
            this._doFillStrokeClose();
          }
        }
      } else {
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(vertices[0][0], vertices[0][1]);
        for (i = 1; i < numVerts; i++) {
          v = vertices[i];
          if (v.isVert) { //if it is a vertex move to the position
            if (v.moveTo) {
              this.drawingContext.moveTo(v[0], v[1]);
            } else {
              this.drawingContext.lineTo(v[0], v[1]);
            }
          }
        }
        this._doFillStrokeClose();
      }
    }
  };

  //////////////////////////////////////////////
  // TRANSFORM
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.applyMatrix =
  function(n00, n01, n02, n10, n11, n12) {
    this.drawingContext.transform(n00, n01, n02, n10, n11, n12);
  };

  p5.Graphics2D.prototype.resetMatrix = function() {
    this.drawingContext.setTransform();
  };

  p5.Graphics2D.prototype.rotate = function(r) {
    this.drawingContext.rotate(r);
  };

  p5.Graphics2D.prototype.scale = function() {
    var x = 1.0,
      y = 1.0;
    if (arguments.length === 1) {
      x = y = arguments[0];
    } else {
      x = arguments[0];
      y = arguments[1];
    }
    this.drawingContext.scale(x, y);

    return this;
  };

  p5.Graphics2D.prototype.shearX = function(angle) {
    this.drawingContext.transform(1, 0, this.tan(angle), 1, 0, 0);
  };

  p5.Graphics2D.prototype.shearY = function(angle) {
    this.drawingContext.transform(1, this.tan(angle), 0, 1, 0, 0);
  };

  p5.Graphics2D.prototype.translate = function(x, y) {
    this.drawingContext.translate(x, y);
  };


  //////////////////////////////////////////////
  // STRUCTURE
  //////////////////////////////////////////////

  p5.Graphics2D.prototype.push = function() {
    this.drawingContext.save();
  };

  p5.Graphics2D.prototype.pop = function() {
    this.drawingContext.restore();
  };


  //////////////////////////////////////////////
  // TYPOGRAPHY
  //////////////////////////////////////////////


  p5.Graphics2D.prototype.textAlign = function(a) {
    this.drawingContext.textAlign = a;
  };

  p5.Graphics2D.prototype.textWidth = function(s) {
    return this.drawingContext.measureText(s).width;
  };

  p5.Graphics2D.prototype._applyTextProperties = function () {
    var str = this._pInst._textStyle + ' ' +
      this._pInst._textSize + 'px ' + this._pInst._textFont;
    this.drawingContext.font = str;
  };

  p5.Graphics2D.prototype.text = function(str, x, y, maxWidth, maxHeight) {
    if (typeof maxWidth !== 'undefined') {
      y += this._pInst._textLeading;
      maxHeight += y;
    }
    str = str.toString();
    str = str.replace(/(\t)/g, '  ');
    var cars = str.split('\n');

    for (var ii = 0; ii < cars.length; ii++) {

      var line = '';
      var words = cars[ii].split(' ');

      for (var n = 0; n < words.length; n++) {
        if (y + this._pInst._textLeading <= maxHeight ||
          typeof maxHeight === 'undefined') {
          var testLine = line + words[n] + ' ';
          var metrics = this.drawingContext.measureText(testLine);
          var testWidth = metrics.width;

          if ( typeof maxWidth !== 'undefined' && testWidth > maxWidth) {
            if (this._pInst._doFill) {
              this.drawingContext.fillText(line, x, y);
            }
            if (this._pInst._doStroke) {
              this.drawingContext.strokeText(line, x, y);
            }
            line = words[n] + ' ';
            y += this._pInst._textLeading;
          }
          else {
            line = testLine;
          }
        }
      }

      if (this._pInst._doFill) {
        this.drawingContext.fillText(line, x, y);
      }
      if (this._pInst._doStroke) {
        this.drawingContext.strokeText(line, x, y);
      }
      y += this._pInst._textLeading;
    }
  };

  
  return p5.Graphics2D;
});