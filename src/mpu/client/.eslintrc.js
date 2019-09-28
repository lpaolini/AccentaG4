module.exports = {
    "env": {
        "browser": true,
        "jquery": true
    },
    "extends": [
        "eslint:recommended"
    ],
    "parserOptions": {
        "ecmaVersion": 9,
        "sourceType": "script"
    },
    "plugins": [
    ],
    "settings": {
    },
    "rules": {
        "arrow-parens": [
            "error", 
            "as-needed"
        ],
        "comma-spacing": [
            "error", {
                "before": false,
                "after": true
            }
        ],
        "eol-last": [
            "error",
            "always"
        ],
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-console": [
            "error", {
                allow: ["info", "warn", "error"]
            }
        ],
        "no-multi-spaces": [
            "error", {
                ignoreEOLComments: true
            }
        ],
        "no-multiple-empty-lines": [
            "error", {
                "max": 1,
                "maxBOF": 0,
                "maxEOF": 1
            }
        ],
        "no-trailing-spaces": [
            "error", {
                "skipBlankLines": true,
                "ignoreComments": false
            }
        ],
        "no-unused-vars": [
            "error", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }
        ],
        "object-curly-spacing": [
            "error",
            "never"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "never"
        ]
    }
};
