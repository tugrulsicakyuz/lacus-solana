/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lacus.json`.
 */
export type Lacus = {
  "address": "Fnw9tWvwyMXieH35WhFfDz7behbDo1teBrVJZ4pZq7rL",
  "metadata": {
    "name": "lacus",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Lacus Tokenized Bond Protocol"
  },
  "instructions": [
    {
      "name": "buyBond",
      "discriminator": [
        213,
        80,
        222,
        237,
        246,
        145,
        5,
        94
      ],
      "accounts": [
        {
          "name": "bondState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond_state.bond_id",
                "account": "bondState"
              }
            ]
          }
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "buyerBondAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "bondMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "issuer",
          "writable": true
        },
        {
          "name": "bondTokenVault",
          "writable": true
        },
        {
          "name": "bondMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimYield",
      "discriminator": [
        49,
        74,
        111,
        7,
        186,
        22,
        61,
        165
      ],
      "accounts": [
        {
          "name": "bondState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond_state.bond_id",
                "account": "bondState"
              }
            ]
          }
        },
        {
          "name": "investorPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bondState"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "investorBondAta"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "depositPrincipal",
      "discriminator": [
        228,
        244,
        95,
        1,
        191,
        34,
        199,
        237
      ],
      "accounts": [
        {
          "name": "bondState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond_state.bond_id",
                "account": "bondState"
              }
            ]
          }
        },
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositYield",
      "discriminator": [
        204,
        126,
        164,
        36,
        57,
        174,
        68,
        139
      ],
      "accounts": [
        {
          "name": "bondState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond_state.bond_id",
                "account": "bondState"
              }
            ]
          }
        },
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeFactory",
      "discriminator": [
        179,
        64,
        75,
        250,
        39,
        254,
        240,
        178
      ],
      "accounts": [
        {
          "name": "factoryState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "authority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "issueBond",
      "discriminator": [
        89,
        175,
        93,
        128,
        140,
        237,
        182,
        162
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "factoryState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "bondState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "factory_state.bond_count",
                "account": "factoryState"
              }
            ]
          }
        },
        {
          "name": "bondMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bondState"
              }
            ]
          }
        },
        {
          "name": "bondTokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "bondState"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "bondMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "issueBondParams"
            }
          }
        }
      ]
    },
    {
      "name": "redeemBond",
      "discriminator": [
        237,
        148,
        187,
        58,
        24,
        181,
        75,
        170
      ],
      "accounts": [
        {
          "name": "bondState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond_state.bond_id",
                "account": "bondState"
              }
            ]
          }
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "investorBondAta",
          "writable": true
        },
        {
          "name": "bondMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bondState",
      "discriminator": [
        251,
        95,
        76,
        47,
        191,
        108,
        163,
        92
      ]
    },
    {
      "name": "factoryState",
      "discriminator": [
        91,
        157,
        184,
        99,
        123,
        112,
        102,
        7
      ]
    },
    {
      "name": "investorPosition",
      "discriminator": [
        145,
        143,
        236,
        150,
        229,
        40,
        195,
        88
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAuthorized",
      "msg": "Not authorized to perform this action"
    },
    {
      "code": 6001,
      "name": "bondAlreadyMatured",
      "msg": "Bond has already matured"
    },
    {
      "code": 6002,
      "name": "bondNotMatured",
      "msg": "Bond has not matured yet"
    },
    {
      "code": 6003,
      "name": "principalNotDeposited",
      "msg": "Principal has not been deposited"
    },
    {
      "code": 6004,
      "name": "supplyExceeded",
      "msg": "Bond supply exceeded"
    },
    {
      "code": 6005,
      "name": "invalidLoanAgreementHash",
      "msg": "Invalid loan agreement hash"
    },
    {
      "code": 6006,
      "name": "invalidMaturityDate",
      "msg": "Invalid maturity date"
    },
    {
      "code": 6007,
      "name": "nothingToClaim",
      "msg": "Nothing to claim"
    },
    {
      "code": 6008,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    }
  ],
  "types": [
    {
      "name": "bondState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bondId",
            "type": "u64"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "faceValue",
            "type": "u64"
          },
          {
            "name": "couponRateBps",
            "type": "u16"
          },
          {
            "name": "maturityTimestamp",
            "type": "i64"
          },
          {
            "name": "maxSupply",
            "type": "u64"
          },
          {
            "name": "tokensSold",
            "type": "u64"
          },
          {
            "name": "totalYieldDeposited",
            "type": "u64"
          },
          {
            "name": "totalPrincipalDeposited",
            "type": "u64"
          },
          {
            "name": "isMatured",
            "type": "bool"
          },
          {
            "name": "principalDeposited",
            "type": "bool"
          },
          {
            "name": "loanAgreementHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bondMint",
            "type": "pubkey"
          },
          {
            "name": "bondTokenVault",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "factoryState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bondCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "investorPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investor",
            "type": "pubkey"
          },
          {
            "name": "bondState",
            "type": "pubkey"
          },
          {
            "name": "lastYieldSnapshot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "issueBondParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "faceValue",
            "type": "u64"
          },
          {
            "name": "couponRateBps",
            "type": "u16"
          },
          {
            "name": "maturityTimestamp",
            "type": "i64"
          },
          {
            "name": "maxSupply",
            "type": "u64"
          },
          {
            "name": "loanAgreementHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};
