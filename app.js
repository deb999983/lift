angular.module('liftApp', [])
.controller('liftController', function ($scope, $timeout, $interval) {
	function Building (floorCount) {
		this.floorCount = 10;
		this.floors = [];
		this.floorHeight = 750/this.floorCount;
		for (var i = floorCount; i > 0; i--) {
			this.floors.push(new Floor(i, this));
		}
		this.lift = new Lift(this);

	}

	function Floor (id, building) {
		this.id = id;
		this.building = building;
	}

	Floor.prototype.callLift = function (type) {
		var lift = this.building.lift;
		lift.enqueDestination(this.id, type);
		lift.move();
	};


	function Lift (building) {
		this.building = building;
		this.currentFloorId = 1;
		this.currentDestination = null;
		this.direction = 1;
		this.isRunning = false;
		this.destinationQueue = [];
		this.position = 0;
	}

	Lift.prototype.start = function (destination) {


		var source = this.currentFloorId;
		var dir = this.direction;
		this.currentDestination = destination;
		this.setIsRunning(true);
		var id = $interval(function () {
			if (this.doorOpen) {
				return;
			}
			if (source == this.currentDestination.floorId) {
				$interval.cancel(id);
				this.dequeDestination(this.currentDestination);
				this.currentDestination = null;
				this.setIsRunning(false);
				//this.position = (source - 1)*75;
				vid.load();
				vid.play();
				this.openDoors().then(function () {
					return this.wait(2000);
				}.bind(this)).then(function () {
					return this.closeDoors();
				}.bind(this)).then(function(){
					return this.wait(1000);
				}.bind(this)).then(function(){
					return this.move();
				}.bind(this));
			} else {
				this.position = this.position + dir*5;
				if (dir == -1) {
					source = Math.ceil(this.position/75) + 1;
				} else {
					source = Math.floor(this.position/75) + 1;
				}
				this.setCurrentFloor(source);
			}
		}.bind(this), 100);
	};

	Lift.prototype.move = function () {
		if (this.doorOpen) {
			return
		}
		var destinations = this.destinationQueue;
		if (this.isRunning) {
			this.currentDestination = destinations[0];
		} else {
			if (this.destinationQueue.length) {
				this.setDirection(this.destinationQueue[0]);
				this.start(this.destinationQueue[0]);
			}
		}
	};

	Lift.prototype.setCurrentFloor = function (floorId) {
		this.currentFloorId = floorId;
	};

	Lift.prototype.setDirection = function (floorId) {
		var oldDirection = this.direction;
		var target;
		if (this.destinationQueue.length == 0) {
			target = floorId;
			this.direction = target >= this.currentFloorId ? 1 : -1;
		} else {
			target = this.destinationQueue[0].floorId;
			this.direction = target >= this.currentFloorId ? 1 : -1;
		}
		if (this.direction != oldDirection)
			this.reCalculatePriorities();
	};

	Lift.prototype.setIsRunning = function (val) {
		this.isRunning = val;
	};

	Lift.prototype.reCalculatePriorities = function () {
		var destinations = angular.copy(this.destinationQueue);
		this.destinationQueue.length = 0;
		for (var i = 0; i < destinations.length; i++) {
			this.enqueDestination(destinations[i].floorId, destinations[i].type);
		}
	};

	Lift.prototype.enqueDestination = function (floorId, type) {

		if (this.contains(floorId, type)) {
			return;
		}

		var currentFloor = this.currentFloorId;
		var distance = floorId - currentFloor;
		var currentLiftDirection = this.direction;

		var priority = null;
		if (currentLiftDirection == 1) {
			if (type == 1) {
				if (distance > 0) {
					priority = 10 - floorId;
				} else {
					priority =  -11; //Doesn't matter will be re-calculated when direction changes
				}
			} else {
				if (distance > 0) {
					priority = floorId - 10;
				} else {
					priority = -11; //Doesn't matter will be re-calculated when direction changes
				}
			}
		} else {
			if (type == 1) {
				if (distance >= 0) {
					priority = -11; //Doesn't matter will be re-calculated when direction changes
				} else {
					priority = 10 - floorId;
				}
			} else {
				if (distance >= 0) {
					priority = -distance; //Doesn't matter will be re-calculated when direction changes
				} else {
					priority = 10 + floorId;
				}
			}
		}

		var obj = {
			type: type,
			priority: priority,
			floorId: floorId
		};

		this.destinationQueue.push(obj);
		this.destinationQueue.sort(function (a, b) {
			return b.priority - a.priority
		});
		this.setDirection(floorId);
	};

	Lift.prototype.dequeDestination = function (destinationObj) {
		for (var i = 0; i < this.destinationQueue.length; i++) {
			if ((this.destinationQueue[i].floorId == destinationObj.floorId) && (this.destinationQueue[i].type == destinationObj.type)) {
				this.destinationQueue.splice(i, 1);
			}
		}
	};

	Lift.prototype.acceptRequest = function (floorId) {
		console.log("Floor ID", floorId, "Current", this.currentFloorId);
		if (floorId > this.currentFloorId) {
			this.enqueDestination(floorId, 1);
		} else {
			this.enqueDestination(floorId, -1);
		}
		if (!this.isRunning)
			this.closeDoors().then(function() {
				return this.wait(1000);
			}.bind(this)).then(function() {
				return this.move();
			}.bind(this));
		else {
			this.move();
		}
	};

	Lift.prototype.closeDoors = function () {
		if (this.isRunning) {
			return;
		}

		if (this.closePromise) {
			return this.closePromise;
		}
		this.closePromise = $timeout(function () {
			//alert("Closing Doors...");
			this.closePromise = null;
			this.doorOpen = false;
		}.bind(this), 200);
		return this.closePromise;
	};

	Lift.prototype.openDoors = function () {
		if (this.isRunning) {
			return;
		}
		if (this.openPromise) {
			return this.openPromise;
		}
		this.openPromise = $timeout(function () {
			//alert("Doors Opened...");
			this.doorOpen = true;
			this.openPromise = null;
		}.bind(this), 200);
		return this.openPromise;
	};

	Lift.prototype.wait = function (time) {
		return $timeout(function () {
			console.log("Waiting...")
		}, time)
	};

	Lift.prototype.contains = function (floorId, type) {
		for (var i = 0; i < this.destinationQueue.length; i++) {
			var obj = this.destinationQueue[i];
			if (obj.floorId == floorId && obj.type == type) {
				return true
			}
		}
		return false;
	};

	$scope.building = new Building(10);
	$scope.floorHeight = 750/$scope.building.floorCount;
	$scope.lift = $scope.building.lift;
	$scope.isRequested = function (floorId, type) {
		return $scope.lift.contains(floorId, type);
	};

	var vid = document.getElementById("LiftAudio");


});
