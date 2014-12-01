// Global namespace
var CHESS = CHESS || {};

/**
Board module
**/
CHESS.Board = function (config) {
    var
        /**
        Constructor for initializing a new board.
        @private
        **/
        init,

        /**
        Contains methods for responding to user interaction. Updates the model and the view.
        @private
        **/
        controller = {
            subscribers: {
                any: []
            }
        },

        /**
        Holds the internal state of the board.
        @private
        **/
        model = CHESS.engine.createPosition(),

        /**
        Contains methods for updating the user interface.
        @private
        **/
        view = {
            container: null,
            canvas: null,
            ctx: null,
            snapshot: null,
            snapshot_ctx: null,
            snapshot_img: new Image(),
            square_size: 0,
            square_color_light: '#ececd7',
            square_color_dark: '#7389b6',
            square_hover_light: '#b4d990',
            square_hover_dark: '#85c249',
            square_light: new Image(),
            square_dark: new Image(),
            dragok: false,
            drag_piece: '',
            // Array position of piece being dragged
            drag_clear_i: 0,
            // Array position of piece being dragged
            drag_clear_j: 0,
            // Coordinate of the mouse/touch event
            left: 0,
            // Coordinate of the mouse/touch event
            top: 0,
            // Coordinate of the last draw of a dragged piece
            last_draw_left: 0,
            // Coordinate of the last draw of a dragged piece
            last_draw_top: 0,
            // Does the piece need cleared from the starting square at the start of a drag?
            piece_not_lifted: true,
            // The white pieces are at the bottom of the screen
            white_down: true,
            highlight_move: false,
            highlight_move_color: '#FF0000',
            highlight_move_alpha: '0.5',
            highlight_hover: false,
            show_row_col_labels: true,
            wp: new Image(),
            wr: new Image(),
            wn: new Image(),
            wb: new Image(),
            wq: new Image(),
            wk: new Image(),
            bp: new Image(),
            br: new Image(),
            bn: new Image(),
            bb: new Image(),
            bq: new Image(),
            bk: new Image()
        };

    /**
    Respond to touch-leave or touch-cancel.

    @param e - The event object.
    **/
    controller.myCancel = function (e) {
        e.preventDefault();
        view.dragok = false;
        view.drag_piece = '';
        view.left = 0;
        view.top = 0;
        view.takeSnapshot();
    };

    /**
    Respond to mouse-down or touch-start.

    @param e - The event object.
    **/
    controller.myDown = function (e) {
        var i,
            j,
            piece,
            piece_color,
            rect = view.canvas.getBoundingClientRect();
        if (model.active) {
            if (e.hasOwnProperty('clientX')) {
                // Mouse event
                view.left = e.clientX - rect.left;
                view.top = e.clientY - rect.top;
                view.canvas.style.cursor = 'move';
            } else if (e.hasOwnProperty('changedTouches')) {
                // Touch event
                view.left = e.changedTouches[0].pageX - rect.left;
                view.top = e.changedTouches[0].pageY - rect.top;
            } else {
                return;
            }

            i = parseInt(view.top / view.square_size, 10);
            j = parseInt(view.left / view.square_size, 10);

            // Flip board for black
            if (!view.white_down) {
                i = 7 - i;
                j = 7 - j;
            }

            if (i < 8) {
                // Dragging a piece on the board
                piece = model.position_array[i][j];
            } else {
                // Dragging a piece in the piece box
                if (model.mode === 'setup') {
                    piece = model.piecebox_array[i - 8][j];
                }
            }
            piece_color = piece.substr(0, 1);
            if (model.mode !== 'setup' && ((model.white_to_move && piece_color === 'b') || (!model.white_to_move && piece_color === 'w'))) {
                view.canvas.style.cursor = 'default';
                return;
            }

            if (piece !== '') {
                view.drag_clear_i = i;
                view.drag_clear_j = j;
                view.drag_piece = piece;
                view.dragok = true;
                view.takeSnapshot(false);
            } else {
                view.canvas.style.cursor = 'default';
            }
        }
    };

    /**
    Respond to mouse-move or touch-move. No relation to the touch-move rule in chess ;).

    @param e - The event object.
    **/
    controller.myMove = function (e) {
        e.preventDefault();
        var myview = view,
            i,
            j,
            ii,
            jj,
            piece,
            clip_start_x,
            clip_start_y,
            clip_width,
            clip_height,
            x,
            y,
            draw_height,
            rect = myview.canvas.getBoundingClientRect(),
            //is_square_light,
            board_size = myview.square_size * 8;

        if (myview.dragok) {
            i = parseInt(myview.top / myview.square_size, 10);
            j = parseInt(myview.left / myview.square_size, 10);
            clip_start_x = (j - 1) * myview.square_size;
            clip_start_y = (i - 1) * myview.square_size;
            clip_width = myview.square_size * 3;
            clip_height = myview.square_size * 3;

            // Draw 3x3 from the snapshot
            if (!(i < 0 || i > 7 || j < 0 || j > 7)) {
                if (clip_start_x < 0) {
                    clip_start_x = 0;
                }
                if (clip_start_y < 0) {
                    clip_start_y = 0;
                }
                if (clip_start_x + clip_width > board_size) {
                    clip_width = board_size - clip_start_x;
                }
                if (clip_start_y + clip_height > board_size) {
                    clip_height = board_size - clip_start_y;
                }
                // Clear the section of the board where the drag piece was drawn
                myview.ctx.drawImage(myview.snapshot, clip_start_x, clip_start_y, clip_width, clip_height, clip_start_x, clip_start_y, clip_width, clip_height);
            }

            // Update values
            if (e.hasOwnProperty('clientX')) {
                // Mouse event
                myview.left = e.clientX - rect.left;
                myview.top = e.clientY - rect.top;
            } else if (e.hasOwnProperty('changedTouches')) {
                // Touch event
                myview.left = e.changedTouches[0].pageX - rect.left;
                myview.top = e.changedTouches[0].pageY - rect.top;
            } else {
                return;
            }
            i = parseInt(myview.top / myview.square_size, 10);
            j = parseInt(myview.left / myview.square_size, 10);

            // Make sure the piece is over the board
            if (i < 0 || i > 7 || j < 0 || j > 7) {
                return;
            }

            // Highlight hover square
            if (myview.highlight_hover) {
                myview.drawSquare('hover', i * myview.square_size, j * myview.square_size);
            }

            // Clear the piece from the starting square (first time only, in case a quick mouse move didn't allow the square to highlight, and never from piece box)
/*            if (myview.piece_not_lifted && myview.drag_clear_i < 8) {
                myview.piece_not_lifted = false;
                
                ii = myview.drag_clear_i;
                jj = myview.drag_clear_j;
                if (!myview.white_down) {
                    ii = 7 - ii;
                    jj = 7 - jj;
                }

                is_square_light = ((myview.drag_clear_i + myview.drag_clear_j) % 2 === 0);
                if (is_square_light) {
                    if (myview.square_light.src !== '') {
                        myview.drawSquare('light', jj * myview.square_size, ii * myview.square_size, myview.ctx);
                    } else {
                        myview.ctx.beginPath();
                        myview.ctx.fillStyle = myview.square_color_light;
                        myview.ctx.rect(jj * myview.square_size, ii * myview.square_size, myview.square_size, myview.square_size);
                        myview.ctx.fill();
                    }
                } else {
                    if (myview.square_dark.src !== '') {
                        myview.drawSquare('dark', jj * myview.square_size, ii * myview.square_size, myview.ctx);
                    } else {
                        myview.ctx.beginPath();
                        myview.ctx.fillStyle = myview.square_color_dark;
                        myview.ctx.rect(jj * myview.square_size, ii * myview.square_size, myview.square_size, myview.square_size);
                        myview.ctx.fill();
                    }
                }
            }*/

            // Draw any piece that was sitting on the hover square
            ii = i;
            jj = j;
            if (!myview.white_down) {
                ii = 7 - i;
                jj = 7 - j;
            }
            piece = model.position_array[ii][jj].substr(0, 2);
            if (piece !== '' && !(ii === myview.drag_clear_i && jj === myview.drag_clear_j)) {
                x = parseInt((j * myview.square_size), 10);
                y = parseInt((i * myview.square_size), 10);
                myview.ctx.drawImage(myview[piece], x, y, myview.square_size, myview.square_size);
            }

            // Draw drag piece
            piece = myview.drag_piece.substr(0, 2);
            x = parseInt(((myview.left - (myview.square_size / 2))), 10);
            y = parseInt(((myview.top - (myview.square_size / 2))), 10);

            // Trim drawing region so it doesn't go into the piece box
            draw_height = myview.square_size;
            if (model.mode === 'setup' && myview.top > myview.square_size * 7.5) {
                draw_height = draw_height - ((myview.top - myview.square_size * 7.5));
            }
            
            // Draw the piece
            myview.ctx.drawImage(myview[piece], x, y, myview.square_size, myview.square_size);
        }
    };

    /**
    Respond to mouse-up or touch-end.

    @param e - The event object.
    **/
    controller.myUp = function (e) {
        var sq1,
            sq2,
            alpha_conversion = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
            i,
            j,
            xy1,
            xy2,
            rect = view.canvas.getBoundingClientRect(),
            drag_piece_temp;

        // Cannot move unless game is active and a piece has been selected
        if (model.active && view.dragok) {
            if (e.hasOwnProperty('clientX')) {
                // Mouse event
                i = parseInt((e.clientY - rect.top) / view.square_size, 10);
                j = parseInt((e.clientX - rect.left) / view.square_size, 10);
                view.canvas.style.cursor = 'default';
            } else if (e.hasOwnProperty('changedTouches')) {
                // Touch event
                i = parseInt((e.changedTouches[0].pageY - rect.top) / view.square_size, 10);
                j = parseInt((e.changedTouches[0].pageX - rect.left) / view.square_size, 10);
            } else {
                return;
            }

            // Flip board for black
            if (!view.white_down) {
                i = 7 - i;
                j = 7 - j;
            }

            // Hold the drag piece info
            drag_piece_temp = view.drag_piece;

            // End the drag
            view.dragok = false;
            view.drag_piece = '';
            view.left = 0;
            view.top = 0;
            view.piece_not_lifted = true;

            // Change position
            if (view.drag_clear_i >= 8) {
                sq1 = 'piecebox';
            } else {
                sq1 = alpha_conversion[view.drag_clear_j] + (8 - view.drag_clear_i);
            }

            if (i >= 8) {
                sq2 = 'piecebox';
            } else {
                sq2 = alpha_conversion[j] + (8 - i);
            }

            xy1 = CHESS.engine.getArrayPosition(sq1);
            xy2 = CHESS.engine.getArrayPosition(sq2);

            if (model.mode === 'setup') {
                if (sq1 !== sq2 && sq1 !== 'piecebox' && sq2 !== 'piecebox') {
                    model.position_array[xy2.substr(1, 1)][xy2.substr(0, 1)] = drag_piece_temp;
                    model.position_array[xy1.substr(1, 1)][xy1.substr(0, 1)] = '';
                } else {
                    if (sq1 === 'piecebox' && sq2 === 'piecebox') {
                        // Do nothing
                    } else if (sq1 === 'piecebox') {
                        model.position_array[xy2.substr(1, 1)][xy2.substr(0, 1)] = drag_piece_temp;
                    } else if (sq2 === 'piecebox') {
                        model.position_array[xy1.substr(1, 1)][xy1.substr(0, 1)] = '';
                    }
                }
            } else {
                model.move(sq1, sq2);
            }

            view.takeSnapshot();
        }
    };

    /**
    Notify all subscribers of an event.

    @param {string} publication - The data or message to send to the subscribers.
    @param {string} type - Type of event.
    **/
    controller.publish = function (publication, type) {
        this.visitSubscribers('publish', publication, type);
    };

    /**
    Notify all subscribers of an event, or remove a subscriber from the list.

    @param {string} action - If not "publish", then "unsubscribe" is assumed.
    @param {object} arg - Arguments to be passed to a callback function, or the callback function itself if unsubscribing.
    @param {number} type - Type of event.
    **/
    controller.visitSubscribers = function (action, arg, type) {
        var pubtype = type || 'any',
            subscribers = this.subscribers[pubtype],
            i,
            max = 0;
        if (subscribers !== undefined) {
            max = subscribers.length;
        }
        for (i = 0; i < max; i += 1) {
            if (action === 'publish') {
                subscribers[i](arg);
            } else {
                if (subscribers[i] === arg) {
                    subscribers.splice(i, 1);
                }
            }
        }
    };

    /**
    Resize the board.

    @param {number} [height=0] - The new height of the board.
    @param {number} [width=0] - The new width of the board.
    **/
    controller.resize = function (height, width) {
        var smaller_size = 0,
            rows = 8;

        // Clean
        height = height || 0;
        width = width || 0;
        height = parseInt(height, 10);
        width = parseInt(width, 10);

        // Attempt to fill the container if no values are found
        if (height === 0 || width === 0) {
            height = parseInt(window.getComputedStyle(view.canvas.parentNode, null).getPropertyValue('height'), 10);
            width = parseInt(window.getComputedStyle(view.canvas.parentNode, null).getPropertyValue('width'), 10);
        }
        smaller_size = (height < width ? height : width);
        if (model.mode === 'setup') {
            rows = 10;
        }
        view.square_size = (height < width ? parseInt(smaller_size / rows, 10) : parseInt(smaller_size / 8, 10));
        view.canvas.height = view.square_size * rows;
        view.canvas.width = view.square_size * 8;
    };

    /**
    Update the internal board with a new move.

    @param {string} sq1 - Current square (eg. e2).
    @param {string} sq2 - New square (eg. e4).
    **/
    model.move = function (sq1, sq2) {
        var pos = {
                position_array: CHESS.engine.clonePositionArray(this.position_array),
                white_to_move: this.white_to_move,
                en_passant: this.en_passant,
                active: this.active,
                gs_castle_kside_w: this.gs_castle_kside_w,
                gs_castle_qside_w: this.gs_castle_qside_w,
                gs_castle_kside_b: this.gs_castle_kside_b,
                gs_castle_qside_b: this.gs_castle_qside_b
            },
            pos_before = {
                fen: CHESS.engine.getFEN(this),
                player_to_move: (this.white_to_move ? 'w' : 'b'),
                sq1: sq1,
                sq2: sq2,
                promote: false,
                mate: false,
                stalemate: false
            },
            xy1,
            xy2,
            piece;

        if (this.last_move) {
            pos.last_move = {
                'sq1': this.last_move.sq1,
                'sq2': this.last_move.sq2
            };
        }

        xy1 = CHESS.engine.getArrayPosition(sq1);
        xy2 = CHESS.engine.getArrayPosition(sq2);
        piece = model.position_array[xy1.substr(1, 1)][xy1.substr(0, 1)].substr(1, 1);
        if (piece === 'p' && ((model.white_to_move && sq2.substr(1, 1) === '8') || (!model.white_to_move && sq2.substr(1, 1) === '1'))) {
            pos_before.promote = true;
        }

        if (!CHESS.engine.moveTemp(pos, sq1, sq2)) {
            view.takeSnapshot();
            return;
        }
        
        if (CHESS.engine.isMate(pos)) {
            pos_before.mate = true;
        } else if (CHESS.engine.isStalemate(pos)) {
            pos_before.stalemate = true;
        }

        // Publish the state before the move is played
        controller.publish(pos_before, 'move_before');

        // Apply position
        this.position_array = CHESS.engine.clonePositionArray(pos.position_array);
        this.white_to_move = pos.white_to_move;
        this.en_passant = pos.en_passant;
        this.active = pos.active;
        this.gs_castle_kside_w = pos.gs_castle_kside_w;
        this.gs_castle_qside_w = pos.gs_castle_qside_w;
        this.gs_castle_kside_b = pos.gs_castle_kside_b;
        this.gs_castle_qside_b = pos.gs_castle_qside_b;
        this.moves += 1;
        if (pos.last_move) {
            this.last_move = {
                'sq1': pos.last_move.sq1,
                'sq2': pos.last_move.sq2
            };
        }
        view.takeSnapshot();

        if (!this.active) {
            return;
        }
        
    };

    /**
    Set the current position.

    @param {string} fen - FEN representation of the position.
    **/
    model.setPosition = function (fen) {
        CHESS.engine.setPosition(this, fen);
    };

    /**
    Create the canvas element and an image buffer.
    **/
    view.buildHtml = function (container) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'chessboard';
        this.canvas.setAttribute('tabindex', 0);
        this.ctx = this.canvas.getContext('2d');
        this.snapshot = document.createElement('canvas');
        this.snapshot_ctx = this.snapshot.getContext('2d');
        if (container !== undefined) {
            document.getElementById(container).appendChild(this.canvas);
        }
    };

    /**
    Draw a piece to the image buffer.

    @param {string} piece - The piece to draw.
    @param {number} x - The horizontal position in pixels.
    @param {number} y - The vertical position in pixels.
    **/
    view.drawPiece = function (piece, x, y) {
        this.snapshot_ctx.drawImage(this[piece], x, y, this.square_size, this.square_size);
    };

    /**
    Draw a square image to the image buffer.

    @param {string} color - hover, light, dark.
    @param {number} x - The horizontal position in pixels.
    @param {number} y - The vertical position in pixels.
    **/
    view.drawSquare = function (color, x, y, context) {
        var ctx = context || this.snapshot_ctx,
            scale = this.square_size / 55, // 55 is the standard size of the square image
            image,
            col = parseInt(x / this.square_size, 10),
            row = parseInt(y / this.square_size, 10),
            rowcol,
            font_size,
            font_margin_top = parseInt(this.square_size / 55 * 11, 10),
            font_margin_left = parseInt(this.square_size / 55 * 8, 10);;

        if (color === 'hover') {
            this.ctx.beginPath();
            if ((col + row) % 2 === 0) {
                this.ctx.fillStyle = this.square_hover_light;
            } else {
                this.ctx.fillStyle = this.square_hover_dark;
            }
            this.ctx.rect(row * this.square_size, col * this.square_size, this.square_size, this.square_size);
            this.ctx.fill();
        } else {
            image = (color === 'light' ? this.square_light : this.square_dark);
            if (image.src !== '') {
                this.snapshot_ctx.save();
                this.snapshot_ctx.scale(scale, scale);
                this.snapshot_ctx.drawImage(image, 0, 0, 55, 55, x, y, 55, 55);
                this.snapshot_ctx.restore();
            } else {
                this.snapshot_ctx.beginPath();
                this.snapshot_ctx.fillStyle = (color === 'light' ? this.square_color_light : this.square_color_dark);
                this.snapshot_ctx.rect(x, y, this.square_size, this.square_size);
                this.snapshot_ctx.fill();
            }
        }

        // Row/Col labels
        if (this.show_row_col_labels && (row === 7 || col === 0)) {
            // Font
            font_size = parseInt(this.square_size / 55 * 12, 10),
            this.snapshot_ctx.font = font_size + 'px arial';
            this.snapshot_ctx.fillStyle = (((7 - row) + col) % 2 === 0 ? this.square_color_light : this.square_color_dark);

            if (col === 0) {
                // Row (display number)
                if (this.white_down) {
                    rowcol = 8 - row;
                } else {
                    rowcol = row + 1;
                }
                this.snapshot_ctx.fillText(rowcol, 2, (row * this.square_size) + font_margin_top);
            }
            if (row === 7) {
                // Columns (display letter)
                if (this.white_down) {
                    rowcol = String.fromCharCode(col + 97);
                } else {
                    rowcol = String.fromCharCode((7 - col) + 97);
                }
                this.snapshot_ctx.fillText(rowcol, ((this.square_size * col) + this.square_size) - font_margin_left, (this.square_size * 8) - 2);
            }
        }
    };

    /**
    Draw the board to an image buffer.
    **/
    view.takeSnapshot = function (refresh) {
        var i,
            j,
            ii,
            jj,
            x,
            y,
            x_pos,
            y_pos,
            piece,
            rows = 8,
            is_square_light,
            rgb = CHESS.hexToRgb(this.highlight_move_color);

        // Prepare canvas for snapshot
        if (model.mode === 'setup') {
            rows = 10;
        }
        this.snapshot.width = this.square_size * 8;
        this.snapshot.height = this.square_size * rows;

        // Draw chessboard
        for (y = 0; y < 8; y += 1) {
            for (x = 0; x < 8; x += 1) {
                if ((x + y) % 2 === 0) {
                    x_pos = x * this.square_size;
                    y_pos = y * this.square_size;
                    this.drawSquare('light', x_pos, y_pos);
                }
            }
        }
        for (y = 0; y < 8; y += 1) {
            for (x = 0; x < 8; x += 1) {
                if ((x + y) % 2 !== 0) {
                    x_pos = x * this.square_size;
                    y_pos = y * this.square_size;
                    this.drawSquare('dark', x_pos, y_pos);
                }
            }
        }

        // Highlight last move, sq1
        if (this.highlight_move) {
            if (typeof model.last_move === 'object' && model.last_move.sq1 !== undefined) {
                this.snapshot_ctx.beginPath();
                this.snapshot_ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', ' + this.highlight_move_alpha + ')';

                x = model.last_move.sq1.substr(0, 1);
                y = model.last_move.sq1.substr(1, 1);
                if (!this.white_down) {
                    x = 7 - x;
                    y = 7 - y;
                }
                this.snapshot_ctx.rect(x * this.square_size, y * this.square_size, this.square_size, this.square_size);

                x = model.last_move.sq2.substr(0, 1);
                y = model.last_move.sq2.substr(1, 1);
                if (!this.white_down) {
                    x = 7 - x;
                    y = 7 - y;
                }
                this.snapshot_ctx.rect(x * this.square_size, y * this.square_size, this.square_size, this.square_size);

                this.snapshot_ctx.fill();
            }
        }

        // Draw pieces
        for (i = 0; i < 8; i += 1) {
            for (j = 0; j < 8; j += 1) {
                if (!this.dragok || !(i === this.drag_clear_i && j === this.drag_clear_j)) {
                    piece = model.position_array[i][j].substr(0, 2);
                    // Flip board for black
                    ii = i;
                    jj = j;
                    if (!this.white_down) {
                        ii = 7 - i;
                        jj = 7 - j;
                    }
                    x = jj * this.square_size;
                    y = ii * this.square_size;
                    if (piece !== '') {
                        this.drawPiece(piece, x, y);
                    }
                }
            }
        }

        if (model.mode === 'setup') {
            // Draw piece box pieces
            for (i = 0; i < 2; i += 1) {
                for (j = 0; j < 8; j += 1) {
                    piece = model.piecebox_array[i][j].substr(0, 2);
                    x = j * this.square_size;
                    y = (i + 8) * this.square_size;
                    if (piece !== '') {
                        this.drawPiece(piece, x, y);
                    }
                }
            }
        }

        // Clear drag piece
        if (this.dragok) {
            i = this.drag_clear_i;
            j = this.drag_clear_j;
            if (!this.white_down) {
                i = 7 - this.drag_clear_i;
                j = 7 - this.drag_clear_j;
            }
            is_square_light = (i + j) % 2 === 0;
            if (is_square_light) {
                if (this.square_light.src !== '') {
                    this.drawSquare('light', j * this.square_size, i * this.square_size, this.ctx);
                } else {
                    this.snapshot_ctx.beginPath();
                    this.snapshot_ctx.fillStyle = this.square_color_light;
                    this.snapshot_ctx.rect(j * this.square_size, i * this.square_size, this.square_size, this.square_size);
                    this.snapshot_ctx.fill();
                }
            } else {
                if (this.square_dark.src !== '') {
                    this.drawSquare('dark', j * this.square_size, i * this.square_size, this.ctx);
                } else {
                    this.snapshot_ctx.beginPath();
                    this.snapshot_ctx.fillStyle = this.square_color_dark;
                    this.snapshot_ctx.rect(j * this.square_size, i * this.square_size, this.square_size, this.square_size);
                    this.snapshot_ctx.fill();
                }
            }
        }

        // Redraw the board from the image buffer
        if (refresh === undefined) {
            refresh = true;
        }
        if (refresh) {
            this.ctx.clearRect(0, this.square_size * 8, this.square_size * 8, this.square_size * 2);
            this.ctx.drawImage(this.snapshot, 0, 0);
        }
    };

    /**
    Draw the board in its current state.
    **/
    this.display = function () {
        view.takeSnapshot();
    };

    /**
    Flip the board.
    **/
    this.flip = function () {
        view.white_down = !view.white_down;
        view.takeSnapshot();
    };

    /**
    Get the color of the player to move.

    @returns {string} Color to move (w, b).
    **/
    this.getActiveColor = function () {
        return (model.white_to_move ? 'w' : 'b');
    };

    /**
    Get the FEN of the current position.

    @returns {string} FEN string.
    **/
    this.getFEN = function () {
        return CHESS.engine.getFEN(model);
    };

    /**
    Get a reference to the canvas element.

    @returns {object} A reference to the canvas element.
    **/
    this.getCanvas = function () {
        return view.canvas;
    };

    /**
    Is the current position checkmate?

    @returns {boolean} True or false.
    **/
    this.isMate = function () {
        return CHESS.engine.isMate(model);
    };

    /**
    Is the current position stalemate?

    @returns {boolean} True or false.
    **/
    this.isStalemate = function () {
        return CHESS.engine.isStalemate(model);
    };

    /**
    Play a move.

    @param {string} san - Move in standard algebraic notation.
    **/
    this.move = function (san) {
        var long_move,
            sq1,
            sq2;

        long_move = CHESS.engine.getLongNotation(model, san);
        long_move = long_move.split('-');
        sq1 = long_move[0];
        sq2 = long_move[1];

        model.move(sq1, sq2);
    };

    /**
    Clear the board.
    **/
    this.positionClear = function () {
        model.position_array = [
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '']
        ];
        model.last_move = {};
        model.en_passant = '';
        model.white_to_move = true;
        model.gs_castle_kside_w = true;
        model.gs_castle_qside_w = true;
        model.gs_castle_kside_b = true;
        model.gs_castle_qside_b = true;
        model.moves = 0;
        view.takeSnapshot();
    };

    /**
    Set the board to the starting position.
    **/
    this.positionStart = function () {
        model.position_array = [
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
        ];
        model.last_move = {};
        model.en_passant = '';
        model.white_to_move = true;
        model.gs_castle_kside_w = true;
        model.gs_castle_qside_w = true;
        model.gs_castle_kside_b = true;
        model.gs_castle_qside_b = true;
        model.moves = 0;
        model.active = true;

        view.takeSnapshot();
    };

    /**
    Resize the board.

    @param {number} [height=0] - The new height of the board.
    @param {number} [width=0] - The new width of the board.
    **/
    this.resize = function (height, width) {
        controller.resize(height, width);
        view.takeSnapshot();
    };

    /**
    Activate/Inactivate the board.

    @param {boolean} active - True or False.
    **/
    this.setActive = function (active) {
        model.active = (active === true);
    };

    /**
    Set the last move (for display purposes).

    @param {string} sq1 - Letter and number of the start square.
    @param {string} sq2 - Letter and number of the end square.
    **/
    this.setLastMove = function (sq1, sq2) {
        sq1 = CHESS.engine.getArrayPosition(sq1);
        sq2 = CHESS.engine.getArrayPosition(sq2);
        model.last_move = {'sq1': sq1, 'sq2': sq2};
    };

    /**
    Change the board mode.

    @param {string} mode - Mode determines the default settings.
    **/
    this.setMode = function (mode) {
        model.mode = mode;
        if (mode === 'setup') {
            model.active = true;
        }
        controller.resize(view.canvas.height, view.canvas.width);
        view.takeSnapshot();
    };

    /**
    Set the board to a new position.

    @param {string} fen - FEN representation of the new position.
    **/
    this.setPosition = function (fen) {
        model.setPosition(fen);
        model.active = true;
        view.takeSnapshot();
    };

    /**
    Allow other modules to subscribe to board change events.

    @param {string} type - Type of event.
    @param {function} fn - A callback function.
    **/
    this.subscribe = function (type, fn) {
        type = type || 'any';
        if (controller.subscribers[type] === undefined) {
            controller.subscribers[type] = [];
        }
        controller.subscribers[type].push(fn);
    };
    
    /**
    Allow other modules to unsubscribe from board change events.

    @param {string} type - Type of event.
    @param {function} fn - A callback function.
    **/
    this.unsubscribe = function (fn, type) {
        controller.visitSubscribers('unsubscribe', fn, type);
    };

    // See declaration comment
    init = function () {
        var path;

        view.buildHtml(config.container);

        // Mouse and touch events
        view.canvas.onmousedown = controller.myDown;
        view.canvas.onmouseup = controller.myUp;
        view.canvas.onmousemove = controller.myMove;
        view.canvas.addEventListener('touchstart', controller.myDown, false);
        view.canvas.addEventListener('touchend', controller.myUp, false);
        view.canvas.addEventListener('touchmove', controller.myMove, false);
        view.canvas.addEventListener('touchleave', controller.myCancel, false);
        view.canvas.addEventListener('touchcancel', controller.myCancel, false);

        view.highlight_move = (config.highlight_move === true ? true : false);
        view.highlight_hover = (config.highlight_hover === true ? true : false);
        view.show_row_col_labels = (config.show_row_col_labels === false ? false : true);
        view.square_color_light = (config.square_color_light ? config.square_color_light : view.square_color_light);
        view.square_color_dark = (config.square_color_dark ? config.square_color_dark : view.square_color_dark);
        view.highlight_move_color = (config.highlight_move_color ? config.highlight_move_color : view.highlight_move_color);
        view.highlight_move_alpha = (config.highlight_move_alpha ? config.highlight_move_alpha : view.highlight_move_alpha);
        view.square_hover_light = (config.square_hover_light ? config.square_hover_light : view.square_hover_light);
        view.square_hover_dark = (config.square_hover_dark ? config.square_hover_dark : view.square_hover_dark);
        model.mode = config.mode;
        model.active = true;

        if (config.fen) {
            model.setPosition(config.fen);
        } else {
            model.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        controller.resize(config.height, config.width);

        path = CHESS.config.library_path + '/img/pieces/' + (config.piece_set || 'default') ;

        // Preload graphics
        view.wp.src = path + '/wp.svg';
        view.wp.onload = function () {
            view.takeSnapshot();
        };

        view.wr.src = path + '/wr.svg';
        view.wr.onload = function () {
            view.takeSnapshot();
        };

        view.wn.src = path + '/wn.svg';
        view.wn.onload = function () {
            view.takeSnapshot();
        };

        view.wb.src = path + '/wb.svg';
        view.wb.onload = function () {
            view.takeSnapshot();
        };

        view.wq.src = path + '/wq.svg';
        view.wq.onload = function () {
            view.takeSnapshot();
        };

        view.wk.src = path + '/wk.svg';
        view.wk.onload = function () {
            view.takeSnapshot();
        };

        view.bp.src = path + '/bp.svg';
        view.bp.onload = function () {
            view.takeSnapshot();
        };

        view.br.src = path + '/br.svg';
        view.br.onload = function () {
            view.takeSnapshot();
        };

        view.bn.src = path + '/bn.svg';
        view.bn.onload = function () {
            view.takeSnapshot();
        };

        view.bb.src = path + '/bb.svg';
        view.bb.onload = function () {
            view.takeSnapshot();
        };

        view.bq.src = path + '/bq.svg';
        view.bq.onload = function () {
            view.takeSnapshot();
        };

        view.bk.src = path + '/bk.svg';
        view.bk.onload = function () {
            view.takeSnapshot();
        };

        if (typeof config.square_dark === 'string') {
            view.square_dark.src = config.square_dark;
            view.square_dark.onload = function () {
                view.takeSnapshot();
            };
        }
        if (typeof config.square_light === 'string') {
            view.square_light.src = config.square_light;
            view.square_light.onload = function () {
                view.takeSnapshot();
            };
        }
    };

    // Immediately initialize the board when an instance is created.
    init();
};