const { tokenTypes, Token, lookupIdent } = require('./token');

class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0; // current position in input (points to current char)
    this.readPosition = 0; // current reading position in input (after current char)
    this.ch = ''; // current char under examination
    this.readChar();
  }

  readChar() {
    if (this.readPosition >= this.input.length) {
      this.ch = 0; // NUL char
    } else {
      this.ch = this.input[this.readPosition];
    }
    this.position = this.readPosition;
    this.readPosition += 1;
  }

  peekChar() {
    if (this.readPosition >= this.input.length) {
      return 0;
    } else {
      return this.input[this.readPosition];
    }
  }

  nextToken() {
    let tok;

    this.skipWhitespace();

    switch (this.ch) {
      case '=':
        if (this.peekChar() === '=') {
          const ch = this.ch;
          this.readChar();
          const literal = ch + this.ch;
          tok = new Token(tokenTypes.EQ, literal);
        } else {
          tok = new Token(tokenTypes.ASSIGN, this.ch);
        }
        break;
      case ';':
        tok = new Token(tokenTypes.SEMICOLON, this.ch);
        break;
      case '(':
        tok = new Token(tokenTypes.LPAREN, this.ch);
        break;
      case ')':
        tok = new Token(tokenTypes.RPAREN, this.ch);
        break;
      case ',':
        tok = new Token(tokenTypes.COMMA, this.ch);
        break;
      case '+':
        tok = new Token(tokenTypes.PLUS, this.ch);
        break;
      case '-':
        tok = new Token(tokenTypes.MINUS, this.ch);
        break;
      case '!':
        if (this.peekChar() === '=') {
          const ch = this.ch;
          this.readChar();
          const literal = ch + this.ch;
          tok = new Token(tokenTypes.NOT_EQ, literal);
        } else {
          tok = new Token(tokenTypes.BANG, this.ch);
        }
        break;
      case '*':
        tok = new Token(tokenTypes.ASTERISK, this.ch);
        break;
      case '/':
        tok = new Token(tokenTypes.SLASH, this.ch);
        break;
      case '<':
        tok = new Token(tokenTypes.LT, this.ch);
        break;
      case '>':
        tok = new Token(tokenTypes.GT, this.ch);
        break;
      case '{':
        tok = new Token(tokenTypes.LBRACE, this.ch);
        break;
      case '}':
        tok = new Token(tokenTypes.RBRACE, this.ch);
        break;
      case 0:
        tok = new Token(tokenTypes.EOF, "");
        break;
      default:
        if (this.isLetter(this.ch)) {
          const literal = this.readIdentifier();
          const type = lookupIdent(literal);
          return new Token(type, literal);
        } else if (this.isDigit(this.ch)) {
          return new Token(tokenTypes.INT, this.readNumber());
        } else {
          tok = new Token(tokenTypes.ILLEGAL, this.ch);
        }
    }

    this.readChar();
    return tok;
  }

  skipWhitespace() {
    while (this.ch === ' ' || this.ch === '\t' || this.ch === '\n' || this.ch === '\r') {
      this.readChar();
    }
  }

  readIdentifier() {
    const start = this.position;
    while (this.isLetter(this.ch) || this.isDigit(this.ch)) {
      this.readChar();
    }
    return this.input.substring(start, this.position);
  }

  isLetter(ch) {
    return 'a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || ch === '_';
  }

  readNumber() {
    const start = this.position;
    while (this.isDigit(this.ch)) {
      this.readChar();
    }
    return this.input.substring(start, this.position);
  }

  isDigit(ch) {
    return '0' <= ch && ch <= '9';
  }
}

module.exports = Lexer;
