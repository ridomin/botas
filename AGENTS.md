# Agents.md

## Overview

This document provides instructions for implementing the same features across three programming languages:
- **.NET** (C#) - [dotnet/](dotnet/)
- **TypeScript/Node.js** - [nodejs/](nodejs/)
- **Python** - [python/](python/)

The goal is to maintain feature parity across all three implementations while following language-specific best practices and conventions.

---

## General Implementation Guidelines

When implementing a new feature:
1. Understand the requirement and design
2. Implement in one language first (reference implementation)
3. Implement the same feature in the other two languages
4. Ensure consistent behavior and output across all implementations
5. Document any language-specific variations
6. Add tests for all language implementations

---

## .NET Implementation (C#)

### Directory: `dotnet/`

**Technology Stack:**
- Language: C#
- Runtime: .NET Core 10
- Package Manager: NuGet

**Setup:**
```bash
cd dotnet
dotnet restore
dotnet build
```

**Key Guidelines:**
- Follow C# naming conventions (PascalCase for classes, camelCase for properties)
- Use async/await for asynchronous operations
- Implement interfaces where appropriate
- Use LINQ for data manipulation
- Handle exceptions explicitly
- Leverage SOLID principles

**Feature Implementation Template:**
- Create feature class in `src/Features/[FeatureName].cs`
- Add unit tests in `tests/[FeatureName].Tests.cs`
- Follow the project structure conventions
- Use dependency injection for loose coupling

**Common Patterns:**
- Use `IEnumerable<T>` for lazy evaluation
- Implement IDisposable for resource management
- Use nullable reference types (C# 8.0+)
- Follow XML documentation conventions

---

## TypeScript/Node.js Implementation

### Directory: `nodejs/`

**Technology Stack:**
- Language: TypeScript
- Runtime: Node.js
- Package Manager: npm / yarn

**Setup:**
```bash
cd nodejs
npm install
npm run build
```

**Key Guidelines:**
- Use strict TypeScript settings (`strict: true`)
- Follow camelCase naming conventions
- Use async/await for asynchronous operations
- Implement proper error handling with typed errors
- Use ES6 modules
- Add JSDoc comments for exported APIs

**Feature Implementation Template:**
- Create feature module in `src/features/[featureName].ts`
- Add unit tests in `tests/[featureName].test.ts`
- Use express or relevant framework for APIs
- Export typed interfaces and classes

**Common Patterns:**
- Use interfaces for contracts
- Implement proper error classes extending Error
- Use enums for constant sets
- Leverage generics for reusable components
- Use option chaining and nullish coalescing

---

## Python Implementation

### Directory: `python/`

**Technology Stack:**
- Language: Python 3.8+
- Package Manager: pip / poetry
- Development: virtual environment recommended

**Setup:**
```bash
cd python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Key Guidelines:**
- Follow PEP 8 style guide
- Use type hints for all functions (Python 3.5+)
- Use snake_case naming conventions
- Implement proper error handling with custom exceptions
- Write docstrings for modules, classes, and functions
- Use async/await with asyncio for concurrent operations

**Feature Implementation Template:**
- Create feature module in `src/features/[feature_name].py`
- Add unit tests in `tests/test_[feature_name].py`
- Use pytest for testing framework
- Document with comprehensive docstrings

**Common Patterns:**
- Use dataclasses or Pydantic for data models
- Implement context managers for resource management
- Use generators for memory-efficient operations
- Leverage decorators for cross-cutting concerns
- Use logging module instead of print statements

---

## Feature Implementation Checklist

For each new feature, ensure:

### Design Phase
- [ ] Write feature specification
- [ ] Design API contracts
- [ ] Identify cross-language consistency points

### Implementation Phase
- [ ] Implement in .NET (C#)
  - [ ] Write feature code
  - [ ] Add unit tests
  - [ ] Document with XML comments
- [ ] Implement in TypeScript/Node.js
  - [ ] Write feature code
  - [ ] Add unit tests
  - [ ] Document with JSDoc/comments
- [ ] Implement in Python
  - [ ] Write feature code
  - [ ] Add unit tests
  - [ ] Document with docstrings

### Verification Phase
- [ ] All implementations produce consistent output
- [ ] All tests pass in all languages
- [ ] Documentation is complete
- [ ] Code follows language conventions
- [ ] Error handling is consistent

---

## Testing Strategy

### Unit Tests
- Each language uses its native testing framework
- Aim for >80% code coverage
- Test both happy paths and error cases

### Integration Tests
- Test feature interactions within same language
- Test external API contracts consistently

### Cross-Language Tests
- Create language-agnostic test specifications
- Verify all implementations meet the same requirements

---

## Documentation

Each implementation should maintain:
- **README.md** in the language directory
- **CONTRIBUTING.md** for development guidelines
- **API.md** or equivalent for API documentation
- Inline code comments for complex logic
- Language-specific documentation (XML comments, JSDoc, docstrings)

---

## Troubleshooting

### Common Issues

**Inconsistent Behavior Across Languages:**
- Review the original specification
- Ensure all edge cases are handled the same way
- Create unit tests that verify consistency

**Performance Differences:**
- Document expected performance characteristics
- Use profiling tools specific to each language
- Consider language limitations and strengths

**Version Compatibility:**
- Maintain compatibility with specified minimum versions
- Document version requirements clearly
- Test with multiple versions when applicable

---

## References

- [.NET Documentation](https://docs.microsoft.com/dotnet/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Python Documentation](https://docs.python.org/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PEP 8 Style Guide](https://www.python.org/dev/peps/pep-0008/)