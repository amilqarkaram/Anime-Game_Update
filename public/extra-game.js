// Sends the clicked answer to the server, which says whether it was right.
// The right button turns green (and a wrong pick red) for a second before
// moving on. Without JavaScript the form still works; it just skips the colours.
const form = document.querySelector(".answerChoices");
const buttons = form.querySelectorAll("button");

function mark(button, colour) {
  button.classList.remove("btn-light");
  button.classList.add(colour);
}

buttons.forEach(function (button) {
  button.addEventListener("click", async function (event) {
    event.preventDefault();
    if (form.dataset.answered) return; // ignore double clicks
    form.dataset.answered = "true";
    try {
      const res = await fetch("/game", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ question: form.elements.question.value, choice: button.value }),
      });
      const result = await res.json();
      buttons.forEach((b) => {
        if (Number(b.value) === result.answer) mark(b, "btn-success");
      });
      if (result.correct === false) mark(button, "btn-danger");
      setTimeout(() => (window.location.href = result.next), 1000);
    } catch (err) {
      window.location.href = "/game";
    }
  });
});
