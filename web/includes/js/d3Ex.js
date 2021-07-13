d3.selection.prototype.last = function(n) {
    let last = this.size() - n;
    return d3.select(this._groups[0][last]);
}