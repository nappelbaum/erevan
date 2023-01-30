'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputName = document.querySelector('#inputName');
const inputPhone = document.querySelector('#inputPhone');
const inputComment = document.querySelector('#inputComment');
const udoli = document.querySelector('.btn__udoli');
const search = document.querySelector('.btn__search');
const modalUdoli = document.querySelector('.formUdoli');
const modalSearch = document.querySelector('.formSearch');
const sidebarCommon = document.querySelector('.sidebar');
const inputSearch = document.getElementById('inputSearch');

class Billiard {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, name, phone, comment) {
    this.coords = coords;
    this.name = name;
    this.phone = phone;
    this.comment = comment;
    this._setDescription();
  }

  _setDescription() {
    this.description = `Дата добавления или изменения: ${new Intl.DateTimeFormat(
      'ru-Ru'
    ).format(this.date)}`;
  }
}

class App {
  #myMap;
  #map;
  #myPlacemark;
  #mapEvent = [];
  position1;
  billiards = [];
  udoliId;
  #redactBilliard;
  #myPlacemarks = [];

  constructor() {
    this._getPosition();
    this._getLocalStorageData();
    this._showUdoliAll();
    form.addEventListener('submit', this._newBilliard.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._moveToBilliard.bind(this)
    );
    containerWorkouts.addEventListener('click', this._resetSeparate.bind(this));
    containerWorkouts.addEventListener('click', this._redact.bind(this));
    sidebarCommon.addEventListener('click', this._resetSeparate.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Невозможно получить ваше местоположение');
        }
      );
    }
  }

  _loadMap(position) {
    // console.log(position);
    this.position1 = position.coords;
    // console.log(this.position1);
    ymaps.ready(this._init.bind(this));
  }

  _init() {
    console.log(this.position1);
    // Загрузка карты
    this.#myMap = new ymaps.Map('map', {
      center: [this.position1.latitude, this.position1.longitude],
      zoom: 13,
    });

    // установка маркера Я
    // this._labelMyGeoObject(
    //   this.position1.latitude,
    //   this.position1.longitude,
    //   'Я'
    // );

    // обработка клика на карте
    this.#myMap.events.add('click', this._getAdressFromCoords.bind(this));

    // Отображение объектов на карте из LocalStorage
    this.billiards.forEach(billiard => {
      this._displayBilliard(billiard);
    });
  }

  _getAdressFromCoords(e) {
    this._removePresetRed();
    this._showForm();
    this.#mapEvent = e._sourceEvent.originalEvent.coords;
    // console.log(this.#mapEvent);

    fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=2c01faf2-15f0-4a0f-861c-42f4e6702a65&format=json&geocode=${
        this.#mapEvent[1]
      },${this.#mapEvent[0]}`
    )
      .then(res => {
        if (!res.ok) throw new Error(`Проблемммммммммма ${res.status}`);
        return res.json();
      })
      .then(data => {
        const result = data.response.GeoObjectCollection.featureMember;
        inputPhone.value = result[0].GeoObject.name;
      })
      .catch(e => console.error(`${e.message} MY ERRORRR`));
  }

  _labelMyGeoObject(lat, lng, content) {
    this.#myPlacemark = new ymaps.Placemark(
      [lat, lng],
      { iconContent: content },
      {
        preset: 'islands#nightStretchyIcon',
      }
    );
    this.#myMap.geoObjects.add(this.#myPlacemark);

    this.#myPlacemark.events.add('click', this._getBilliardByCoords.bind(this));

    this.#myPlacemarks.push(this.#myPlacemark);
  }

  _showForm() {
    form.classList.remove('hidden');
    form.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  _hideForm() {
    inputName.value = inputPhone.value = inputComment.value = '';
    form.classList.add('hidden');
  }

  _showUdoliAll() {
    if (this.billiards.length !== 0) {
      udoli.classList.remove('hidden');
    } else {
      udoli.classList.add('hidden');
    }
    if (this.billiards.length !== 0) {
      search.classList.remove('hidden');
    } else {
      search.classList.add('hidden');
    }
  }

  _newBilliard(e) {
    e.preventDefault();

    if (udoli.classList.contains('hidden')) {
      udoli.classList.remove('hidden');
    }

    if (search.classList.contains('hidden')) {
      search.classList.remove('hidden');
    }

    let lat;
    let lng;

    if (this.#redactBilliard) {
      lat = this.#redactBilliard.coords[0];
      lng = this.#redactBilliard.coords[1];
    } else {
      lat = this.#mapEvent[0];
      lng = this.#mapEvent[1];
    }
    console.log(lat, lng);

    let billiard;

    //Получить данные из формы
    const name = inputName.value;
    const phone = inputPhone.value;
    const comment = inputComment.value;

    // создать объект Billiard
    billiard = new Billiard([lat, lng], name, phone, comment);

    // Добавить новый объект в массив бильярдных клубов
    this.billiards.push(billiard);

    // Отобразить бильярд на карте
    this._displayBilliard(billiard);

    // Отобразить бильярд в списке
    this._displayBilliardOnSidebar(billiard);

    // Спрятать форму и очистить поля ввода данных
    this._hideForm();

    // Добавить все бильярдные клубы в локальное хранилище
    this._addBilliardsToLocalStorage();

    // Удалить тренировку при редактировании
    if (this.#redactBilliard) {
      this.reset(this.#redactBilliard.id);
    }
  }

  _displayBilliard(billiard) {
    this._labelMyGeoObject(
      billiard.coords[0],
      billiard.coords[1],
      `${billiard.name}`
    );
  }

  _displayBilliardOnSidebar(billiard) {
    let html = `
        <li class="workout" data-id="${billiard.id}">
          <h2 class="workout__title">${billiard.description}</h2>
          <div class="workout__details">
            <span class="workout__unit">Название</span>
            <span class="workout__value">${billiard.name}</span>
          </div>
          <div class="workout__details">
            <span class="workout__unit">Адрес</span>
            <span class="workout__value">${billiard.phone}</span>

          </div>
          <div class="workout__details">
            <span class="workout__unit">Комментарии</span>
            <span class="workout__value">${billiard.comment}</span>
           
          </div>
          <div class="workout__details">
            <button class="btn__udoli1" data-id="${billiard.id}">Удалить</button>
            <button class="btn__redact" data-id="${billiard.id}">Редактировать</button>
          </div>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToBilliard(e) {
    const element = e.target.closest('.workout');
    if (!element) return;
    this._noPoint();
    this._removePresetRed();
    const billiard = this.billiards.find(
      item => item.id === element.dataset.id
    );
    this.#myMap.panTo(billiard.coords, { duration: 1000 });
    this._hideForm();
    this.#redactBilliard = 0;

    this.#myPlacemarks.forEach(elem => {
      if (elem.properties._data.iconContent === billiard.name) {
        elem.options.set({
          preset: 'islands#redStretchyIcon',
        });
      }
    });
  }

  _removePresetRed() {
    this.#myPlacemarks.forEach(elem => {
      elem.options.set({
        preset: 'islands#nightStretchyIcon',
      });
    });
  }

  _getBilliardByCoords(e) {
    this._noPoint();
    this._removePresetRed();
    // console.log(e);
    let coords = e.get('coords');
    // console.log(coords);
    let temp1;
    let billiardAim = [];

    for (let i = 0; i < this.billiards.length; i++) {
      temp1 =
        Math.abs(this.billiards[i].coords[0] - coords[0]) +
        Math.abs(this.billiards[i].coords[1] - coords[1]);

      billiardAim.push(temp1);
    }

    // console.log(billiardAim);
    // console.log(this.billiards[3]);

    let temp2 = 1;
    let temp2Index;
    for (let i = 0; i < this.billiards.length; i++) {
      if (billiardAim[i] < temp2) {
        temp2 = billiardAim[i];
        temp2Index = i;
      }
    }

    this._paintSidebar(this.billiards[temp2Index].id);

    // console.log(this.billiards[temp2Index]);
    // console.log(this.billiards);
  }

  _resetSeparate(e) {
    if (
      e.target &&
      !e.target.closest('.form') &&
      !e.target.closest('.btn__udoli1') &&
      !e.target.closest('.btn__redact') &&
      !e.target.closest('.btn__udoli') &&
      !e.target.closest('.btn__search')
    ) {
      this._hideForm();
      this.#redactBilliard = 0;
    }

    // нажали кнопку удалить
    const udoli1 = e.target.closest('.btn__udoli1');
    if (udoli1) {
      this._removePresetRed();
      this.udoliId = udoli1.dataset.id;
      modalUdoli.classList.remove('hidden');
    }

    // нажали кнопку Да
    const udoli2 = e.target.closest('#btnUdoliYes');
    if (udoli2) {
      this.reset(this.udoliId);
    }

    // нажали кнопку Нет
    const udoli3 = e.target.closest('#btnUdoliNo');
    if (udoli3) {
      modalUdoli.classList.add('hidden');
    }

    // нажали кнопку удалить все
    const udoli4 = e.target.closest('.btn__udoli');
    if (udoli4) {
      this._removePresetRed();
      this.resetAll();
    }

    // Нажали кнопку поиск
    const search = e.target.closest('.btn__search');
    if (search) {
      this._removePresetRed();
      modalSearch.classList.remove('hidden');
    }

    // Нажали кнопку ок
    const pressOk = e.target.closest('.btn__search1');
    if (pressOk) {
      this._noPoint();

      this.billiards.forEach(item => {
        if (
          item.name.toLowerCase().includes(inputSearch.value.toLowerCase()) &&
          inputSearch.value !== ''
        ) {
          this._paintSidebar(item.id);

          this.#myMap.panTo(item.coords, { duration: 1000 });

          this.#myPlacemarks.forEach(elem => {
            if (elem.properties._data.iconContent === item.name) {
              elem.options.set({
                preset: 'islands#redStretchyIcon',
              });
            }
          });
        }
      });
      inputSearch.value = '';
      modalSearch.classList.add('hidden');
    }

    // Нажали кнопку отмена
    const pressCancel = e.target.closest('#cancel');
    if (pressCancel) {
      this._noPoint();

      modalSearch.classList.add('hidden');
    }
  }

  _redact(e) {
    const redact = e.target.closest('.btn__redact');
    if (redact) {
      this._removePresetRed();
      const redactBilliard = this.billiards.find(
        item => item.id === redact.dataset.id
      );
      this.#redactBilliard = redactBilliard;
      form.classList.remove('hidden');
      form.scrollIntoView({ block: 'center', behavior: 'smooth' });

      console.log(this.#redactBilliard);

      inputName.value = redactBilliard.name;
      inputPhone.value = redactBilliard.phone;
      inputComment.value = redactBilliard.comment;
    }
  }

  _paintSidebar(id1) {
    const childBar = containerWorkouts.children;

    for (let i = 0; i < childBar.length; i++) {
      if (childBar[i].dataset.id === id1) {
        childBar[i].style.backgroundColor = 'green';
        childBar[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    // document
    //   .querySelector('.workout')
    //   .scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  _noPoint() {
    const childBar = containerWorkouts.children;
    for (let i = 0; i < childBar.length; i++) {
      if (childBar[i].style.backgroundColor === 'green') {
        childBar[i].style.backgroundColor = '#3f464d';
      }
    }
  }

  _addBilliardsToLocalStorage() {
    localStorage.setItem('billiards', JSON.stringify(this.billiards));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('billiards'));

    if (!data) return;

    this.billiards = data;

    this.billiards.forEach(billiard => {
      this._displayBilliardOnSidebar(billiard);
    });
  }

  reset(id) {
    const data1 = JSON.parse(localStorage.getItem('billiards'));
    const data1Index = data1.findIndex(item => item.id === `${id}`);
    data1.splice(data1Index, 1);

    localStorage.removeItem('billiards');

    location.reload();
    // console.log(data1);

    localStorage.setItem('billiards', JSON.stringify(data1));
  }

  resetAll() {
    localStorage.removeItem('billiards');
    location.reload();
  }
}

const app = new App();
