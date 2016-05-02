function Field(definition, value) {
  this.definition = definition;
  this.value = value;
}

Field.prototype.validate = function() {
  if (this.definition.required && this.value == null) {
    throw new Error("cannot create observation, '" + this.definition.name + "' property is required");
  }
};

module.exports = Field;
