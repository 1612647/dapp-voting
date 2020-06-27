const createdState = 0;
const votingState = 1;
const endedState = 2;
App = {
  web3Provider: null,
  contracts: {},
  hasVoted: false,
  account: "0x0",
  state: undefined,

  init: async function () {
    // Load pets.
    // $.getJSON('../pets.json', function(data) {
    //   var petsRow = $('#petsRow');
    //   var petTemplate = $('#petTemplate');

    //   for (i = 0; i < data.length; i ++) {
    //     petTemplate.find('.panel-title').text(data[i].name);
    //     petTemplate.find('img').attr('src', data[i].picture);
    //     petTemplate.find('.pet-breed').text(data[i].breed);
    //     petTemplate.find('.pet-age').text(data[i].age);
    //     petTemplate.find('.pet-location').text(data[i].location);
    //     petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

    //     petsRow.append(petTemplate.html());
    //   }
    // });

    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (typeof web3 !== "undefined") {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider(
        "http://localhost:7545"
      );
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function () {
    $.getJSON("Election.json", function (election) {
      console.log('election', election)
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.eventListenes();
      return App.bindEvents();
    });
  },

  // Listen for events from the contract
  eventListenes: function () {
    App.contracts.Election.deployed().then(function (instance) {
      // instance.candidateAdded({}, {
      //   fromBlock: 'latest',
      // }).watch(function (error, event) {
      //   console.log("triggered1");
      //   // Reload when a new vote is recorded
      //   // return App.bindCandidateListEvents();
      // });

      // instance
      //   .voterRegistered({}, {
      //     fromBlock: 'latest',
      //   })
      //   .watch(function (error, event) {
      //     console.log("triggered2", )
      //     // Reload when a new voter is recorded
      //     return App.bindJoinVoteEvents();
      //   });
        
      instance
        .voteDone({}, {
          from: App.account,
        }
        )
        .watch(function (error, event) {
          console.log("triggered3", )
          // Reload when a new voter is recorded
          return App.bindVoteDoneEvents();
        });

    });
  },

  bindEvents: function () {
    $("#loader").show();
    $("#control").hide();
    $("#content").hide();

    // Load account data
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });
    //Load election state
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.electionState();
      })
      .then(function (electionState) {
        switch (electionState.c[0]) {
          case createdState:
            App.state = createdState;
            $("#statusLabel").text("Not started");
            $("#addCandidate").attr("disabled", false);
            $("#startVote").attr("disabled", false);
            $("#endVote").attr("disabled", true);
            $("#joinVote").attr("disabled", false);
            $("#voteBtn").attr("disabled", true);
            $("#voteBtn").text("Waiting for start");
            break;
          case votingState:
            App.state = votingState;
            $("#statusLabel").text("Voting");
            $("#addCandidate").attr("disabled", true);
            $("#startVote").attr("disabled", true);
            $("#endVote").attr("disabled", false);
            $("#joinVote").attr("disabled", true);
            break;
          case endedState:
            $("#statusLabel").text("Vote ended");
            App.state = endedState;
            $("#addCandidate").attr("disabled", true);
            $("#startVote").attr("disabled", true);
            $("#endVote").attr("disabled", true);
            $("#joinVote").attr("disabled", true);
            break;
        }
      })
      .catch(function (error) {
        console.warn(error);
      });

      App.bindCandidateListEvents()
      App.bindVoteDoneEvents()
      App.bindJoinVoteEvents()
      App.bindWinnerEvents()
      App.bindControlEvents()
  },

  bindJoinVoteEvents: function () {
    $("#loader").show();
    $("#control").hide();
    $("#content").hide();

    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.voterRegister(App.account);
      })
      .then(function (voter) {
        if (voter[0]) {
          $("#joinVote").attr("disabled", true);
          $("#joinVote").text("Joined");
        } else if(App.state !== createdState){
          $("#joinVote").attr("disabled", true);
          $("#joinVote").text("Can't join");
          $("#voteBtn").attr("disabled", true);
          $("#voteBtn").text("You didn't join this vote");
        }
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  bindCandidateListEvents: function () {
    let electionInstance;
    $("#loader").show();
    $("#control").hide();
    $("#content").hide();

    App.contracts.Election.deployed()
      .then(function (instance) {
        electionInstance = instance;
        return electionInstance.candidatesCount();
      })
      .then(function (candidatesCount) {
        const candidatesTable = $("#candidatesTable");
        const candidateOptions = $("#candidateOptions");
        const candidatesResults = $("#candidatesResults");
        candidatesResults.empty();

        const candidatesSelect = $("#candidatesSelect");
        candidatesSelect.empty();

        if (candidatesCount == 0) {
          candidatesTable.empty();
          candidatesTable.append(
            `<p class="text-center">Candidate list is empty<p>`
          );
          candidateOptions.hide();
        } else {
          for (let i = 1; i <= candidatesCount; i++) {
            electionInstance.candidates(i).then(function (candidate) {
              const id = candidate[0];
              const name = candidate[1];
              const voteCount = candidate[2];

              // Render candidate Result
              let candidateTemplate =
                "<tr><th>" +
                id +
                "</th><td>" +
                name +
                "</td><td>" +
                voteCount +
                "</td></tr>";
              candidatesResults.append(candidateTemplate);

              // Render candidate ballot option
              const candidateOption =
                "<option value='" + id + "' >" + name + "</ option>";
              candidatesSelect.append(candidateOption);
            });
          }
        }
        $("#loader").hide();
        $("#control").show();
        $("#content").show();
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  bindVoteDoneEvents: function () {
    $("#loader").show();
    $("#control").hide();
    $("#content").hide();

    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.voterRegister(App.account);
      })
      .then(function (voter) {
        const voted = voter[2];
        if (voted) {
          $("#candidateOptions").hide();
          $("#voteBtn").attr("disabled", true);
          $("#voteBtn").text("Voted");
        }
        $("#loader").hide();
        $("#control").show();
        $("#content").show();
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  bindWinnerEvents: function () {
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.finalWinner();
      })
      .then(function (finalWinner) {
          $("#finalWinner").html(`<h4><strong>${finalWinner}</strong> is winner</h4><hr>`);
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  bindControlEvents: function () {
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.electionOwnerAddress();
      })
      .then(function (electionOwnerAddress) {
        if(electionOwnerAddress != App.account) {
          $('#control').hide();
        } else $('#control').show();
      })
      .catch(function (error) {
        console.warn(error);
      });    
  },

  markAdopted: function (adopters, account) {
    /*
     * Replace me...
     */
  },

  registerVoter: function () {
    var voterName = $("#voterName").val();
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.joinVote(App.account, voterName);
      })
      .then(function (result) {
        // Wait for votes to update
        location.reload();
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  startVote: function () {
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.startVote();
      })
      .then(function (result) {
        // Wait for votes to update
        location.reload();
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  endVote: function () {
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.endVote();
      })
      .then(function (result) {
        // Wait for votes to update
        location.reload();
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  handleVote: function (event) {
    event.preventDefault();

    var candidateId = $("#candidatesSelect").val();
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.doVote(candidateId, { from: App.account });
      })
      .then(function (result) {
        // Wait for votes to update
        console.log("result", result);
        location.reload();
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  addElection: function () {},

  addCandidate: function () {
    var candidateName = $("#candidateName").val();
    App.contracts.Election.deployed()
      .then(function (instance) {
        return instance.addCandidate(candidateName);
      })
      .then(function (result) {
        $("#addCandidateModal").modal("hide");
        location.reload();
        // Wait for votes to update
      })
      .catch(function (err) {
        console.error(err);
      });
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
  window.ethereum.on('accountsChanged', function (accounts) {
    location.reload();
    // Time to reload your interface with accounts[0]!
  })
});
