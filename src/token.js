const tokenTypes = {
  ILLEGAL: 'ILLEGAL',
  EOF: 'EOF',

  // Identifiers + literals
  IDENT: 'IDENT', // add, foobar, x, y, ...
  INT: 'INT',   // 1343456

  // Operators
  ASSIGN: '=',
  PLUS: '+',
  MINUS: '-',
  BANG: '!',
  ASTERISK: '*',
  SLASH: '/',

  LT: '<',
  GT: '>',

  EQ: '==',
  NOT_EQ: '!=',

  // Delimiters
  COMMA: ',',
  SEMICOLON: ';',

  LPAREN: '(',
  RPAREN: ')',
  LBRACE: '{',
  RBRACE: '}',

  // Keywords
  FUNCTION: 'FUNCTION',
  LET: 'LET',
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  IF: 'IF',
  ELSE: 'ELSE',
  RETURN: 'RETURN',
};

class Token {
  constructor(type, literal) {
    this.type = type;
    this.literal = literal;
  }
}

const keywords = {
  'fn': tokenTypes.FUNCTION,
  'let': tokenTypes.LET,
  'true': tokenTypes.TRUE,
  'false': tokenTypes.FALSE,
  'if': tokenTypes.IF,
  'else': tokenTypes.ELSE,
  'return': tokenTypes.RETURN,
};

function lookupIdent(ident) {
  return keywords[ident] || tokenTypes.IDENT;
}

module.exports = { tokenTypes, Token, lookupIdent };
