Serializing objects with `JSON.stringify()` can lose information for certain data payload.
For example, an instance of Error will result in empty output like `{}` because it's properties are not enumerable.

This rule disallows serializing such objects with potential issue by matching the name of the first parameter passed to JSON.stringify() with Regexp pattern.
