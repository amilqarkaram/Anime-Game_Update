for(var i = 0; i < 4; ++i){
document.querySelectorAll("button")[i].addEventListener("click",function(){
  if(this.value === "correct"){
  this.classList.remove("btn-light");
  this.classList.add("btn-success");
}
  else{
    this.classList.remove("btn-light");
    this.classList.add("btn-danger");
  }
});
}
