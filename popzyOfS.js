const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

Popzy.elements = [];

function Popzy(options = {}) {
    this.opt = Object.assign(
        {
            // content : required
            // templateId : required
            //
            destroyOnClose: true,
            footer: false,
            cssClass: [],
            enableScrollLock: true,
            scrollLockTarget: function () {
                return document.body;
            },
            closeMethods: ["button", "overlay", "escape"],
        },
        options
    );

    if (this.opt.content) {
        this.contentHtml = this.opt.content;
    } else if (this.opt.templateId) {
        this.template = $(`#${this.opt.templateId}`);
        if (!this.template) {
            console.error(`#${this.opt.templateId} does not exist!`);
            return;
        }
    } else {
        console.error(` content and template of this button does not exist!`);
        return;
    }

    const { closeMethods } = this.opt;
    this._allowButtonClose = closeMethods.includes("button");
    this._allowBackdropClose = closeMethods.includes("overlay");
    this._allowEscapeClose = closeMethods.includes("escape");

    // scroll handle
    this._scrollLockTarget = this.opt.scrollLockTarget();
    this._enableScrollLock = this.opt.enableScrollLock;
    this._isTargetHavingScrollBar = this._hasScrollBar(this._scrollLockTarget);

    this._footerButtons = [];
    this._handleEscapeKey = this._handleEscapeKey.bind(this);
}

Popzy.prototype._build = function () {
    if (this.contentHtml) {
        var content = document.createElement(`div`);
        content.innerHTML = this.contentHtml;
    } else {
        var content = this.template.content.cloneNode(true);
    }

    // Create modal elements
    this._backdrop = document.createElement("div");
    this._backdrop.className = "popzy__backdrop";

    const container = document.createElement("div");
    container.className = "popzy__container";

    this.opt.cssClass.forEach((className) => {
        if (typeof className === "string") {
            container.classList.add(className);
        }
    });

    if (this._allowButtonClose) {
        const closeBtn = this._createButton("&times;", "popzy__close", () =>
            this.close()
        );
        container.append(closeBtn);
    }

    const modalContent = document.createElement("div");
    modalContent.className = "popzy__content";

    // Append content and elements
    modalContent.append(content);
    container.append(modalContent);

    if (this.opt.footer) {
        this._modalFooter = document.createElement("div");
        this._modalFooter.className = "popzy__footer";

        this._renderFooterContent();
        this._renderFooterButtons();

        container.append(this._modalFooter);
    }

    this._backdrop.append(container);
    document.body.append(this._backdrop);
};

Popzy.prototype.setFooterContent = function (html) {
    this._footerContent = html;
    this._renderFooterContent();
};

Popzy.prototype._renderFooterContent = function () {
    if (this._modalFooter && this._footerContent) {
        this._modalFooter.innerHTML = this._footerContent;
    }
};

Popzy.prototype._createButton = function (title, cssClass, callback) {
    const button = document.createElement("button");
    button.className = cssClass;
    button.innerHTML = title;
    button.onclick = callback;

    return button;
};

Popzy.prototype.addFooterButton = function (title, cssClass, callback) {
    const button = this._createButton(title, cssClass, callback);
    this._footerButtons.push(button);
    this._renderFooterButtons();
};

Popzy.prototype._renderFooterButtons = function () {
    if (this._modalFooter) {
        this._footerButtons.forEach((button) => {
            this._modalFooter.append(button);
        });
    }
};

Popzy.prototype.open = function () {
    Popzy.elements.push(this);

    if (!this._backdrop) {
        this._build();
    }

    setTimeout(() => {
        this._backdrop.classList.add("popzy--show");
    }, 0);

    // Disable scrolling

    if (this._enableScrollLock && this._isTargetHavingScrollBar) {
        const target = this._scrollLockTarget;

        console.log(target);

        this._scrollLockTargetPaddingRight = parseInt(
            window.getComputedStyle(target).paddingRight
        );
        console.log(this._scrollLockTargetPaddingRight);
        target.classList.add("popzy--no-scroll");

        console.log(target.classList);

        target.style.paddingRight =
            this._scrollLockTargetPaddingRight +
            this._getScrollbarWidth(target) +
            "px";
    }

    // Attach event listeners
    if (this._allowBackdropClose) {
        this._backdrop.onclick = (e) => {
            if (e.target === this._backdrop) {
                this.close();
            }
        };
    }

    if (this._allowEscapeClose) {
        document.addEventListener("keydown", this._handleEscapeKey);
    }

    this.opt.onOpen.call(this);

    return this._backdrop;
};

Popzy.prototype._handleEscapeKey = function (e) {
    const lastModal = Popzy.elements[Popzy.elements.length - 1];
    if (e.key === "Escape" && this === lastModal) {
        this.close();
    }
};

Popzy.prototype._onTransitionEnd = function (callback) {
    const handler = (e) => {
        if (e.propertyName !== "transform") return;
        this._backdrop.removeEventListener("transitionend", handler);
        if (typeof callback === "function") callback();
    };

    this._backdrop.addEventListener(`transitionend`, handler);
};

Popzy.prototype.close = function (destroy = this.opt.destroyOnClose) {
    Popzy.elements.pop();

    this._backdrop.classList.remove("popzy--show");

    if (this._allowEscapeClose) {
        document.removeEventListener("keydown", this._handleEscapeKey);
    }

    this._onTransitionEnd(() => {
        if (this._backdrop && destroy) {
            this._backdrop.remove();
            this._backdrop = null;
            this._modalFooter = null;
        }

        // Enable scrolling
        if (
            this._enableScrollLock &&
            this._isTargetHavingScrollBar &&
            !Popzy.elements.length
        ) {
            const target = this._scrollLockTarget;
            target.classList.remove("popzy--no-scroll");
            target.style.paddingRight = "";
        }

        if (typeof this.opt.onClose === "function") {
            this.opt.onClose.call(this);
        }
    });
};

Popzy.prototype.destroy = function () {
    this.close(true);
};

Popzy.prototype._getScrollbarWidth = function (target) {
    if (this._scrollbarWidth) return this._scrollbarWidth;

    const div = document.createElement("div");
    Object.assign(div.style, {
        overflow: "scroll",
        position: "absolute",
        top: "-9999px",
    });

    target.appendChild(div);
    this._scrollbarWidth = div.offsetWidth - div.clientWidth;
    target.removeChild(div);

    return this._scrollbarWidth;
};

Popzy.prototype._hasScrollBar = function (target) {
    if ([document.documentElement, document.body].includes(target)) {
        return (
            document.documentElement.scrollHeight !==
                document.documentElement.clientHeight ||
            document.body.scrollHeight !== document.body.clientHeight
        );
    }

    return target.scrollHeight !== target.clientHeight;
};
