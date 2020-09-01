const createdState = 0;
const votingState = 1;
const endedState = 2;
App = {
  web3Provider: null,
  contracts: {},
  hasVoted: false,
  account: "0x0",
  state: undefined,
  eletionAbi: undefined,
  currContractAddress: undefined,

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (typeof web3 !== "undefined") {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
      web3.defaultAccount = await ethereum.enable();
      if (!web3.defaultAccount) {
        console.log("User not found");
      } else {
        console.log("User access");
      }
    } else {
      App.web3Provider = new Web3.providers.HttpProvider(
        "http://localhost:8545"
      );
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function () {
    $.getJSON("ElectionFactory.json", function (factory) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Factory = TruffleContract(factory);
      // Connect provider to interact with contract
      App.contracts.Factory.setProvider(App.web3Provider);

      $.getJSON("Election.json", function (election) {
        App.eletionAbi = election.abi;
      });

      return App.bindEvents();
    });
  },

  bindEvents: function () {
    // Load account data
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    const queryString = location.search;
    const urlParams = new URLSearchParams(queryString);
    const address = urlParams.get("address");
    if (address) {
      App.currContractAddress = address;
      return App.bindElectionEvents(address);
      // return App.eventListenes(address);
    }
    return App.bindElectionFactoryEvents();
  },

  // Listen for events from the contract
  eventListenes: function (address) {
    App.contracts.Factory.deployed().then(function (instance) {
      const electionInstance = App.getContractInstance(address);
      electionInstance
        .voteDone(
          {},
          {
            fromBlock: 0,
            toBlock: "latest",
          }
        )
        .watch(function (error, event) {
          console.log("error :>> ", error);
          console.log("event :>> ", event);
          console.log("triggered1");
          if (event) {
            App.bindVoteDoneEvents(address);
          }
        });

      electionInstance
        .candidateAdded(
          {},
          {
            from: App.account,
          }
        )
        .watch(function (error, event) {
          console.log("error :>> ", error);
          console.log("event :>> ", event);
          console.log("triggered2");
          if (event) {
            App.bindCandidateListEvents(address);
          }
        });
      electionInstance
        .voterRegistered(
          {},
          {
            fromBlock: 0,
            toBlock: "latest",
          }
        )
        .watch(function (error, event) {
          console.log("error :>> ", error);
          console.log("event :>> ", event);
          console.log("triggered3");
          if (event) {
            App.bindJoinVoteEvents(address);
          }
        });
    });
  },

  getContractInstance: function (contractAddress) {
    const contracts = web3.eth.contract(App.eletionAbi);
    contractInstance = contracts.at(contractAddress);
    return contractInstance;
  },

  bindElectionFactoryEvents: function () {
    App.bindContractListEvents();
  },

  bindContractListEvents: function () {
    let electionsInstance;
    $("#loaderList").show();
    $("#controlList").hide();
    $("#contentList").hide();
    $("#connectedList").hide();

    let factoryInstance;
    App.contracts.Factory.deployed()
      .then(function (instance) {
        factoryInstance = instance;
        return factoryInstance.contractsCount();
      })
      .then(function (contractsCount) {
        App.contractsCount = contractsCount.c[0];

        const contentList = $("#contentList .row");
        contentList.empty();

        if (App.contractsCount == 0) {
          contentList.empty();
          contentList.append(
            `<p class="text-center">Contract list is empty<p>`
          );
        } else {
          factoryInstance
            .getContractList()
            .then(function (contractAddressList) {
              for (let i = 0; i < App.contractsCount; i++) {
                const electionInstance = App.getContractInstance(
                  contractAddressList[i]
                );
                const address = electionInstance.address;
                electionInstance.electionOfficialName(function (err1, name) {
                  if (!err1) {
                    electionInstance.electionDescription(function (
                      err2,
                      description
                    ) {
                      if (!err2) {
                        const electionTemplate = `
                        <div class="col-sm-6 col-md-4">
                        <div class="thumbnail">
                          <div class="caption">
                            <h3>${name}</h3>
                            <p>Address: ${address}</p>
                            <p>Description: ${description}</p>
                            <p><a href="/vote.html?address=${address}" class="btn btn-primary" role="button">Join</a></p>
                          </div>
                        </div>
                      </div>`;
                        contentList.append(electionTemplate);
                      }
                    });
                  }
                });
              }
            });
        }
        $("#loaderList").hide();
        $("#controlList").show();
        $("#contentList").show();
        $("#connectedList").show();
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  bindElectionEvents: function (address) {
    $("#loader").show();
    $("#control #addCandidate").hide();
    $("#control #startVote").hide();
    $("#control #endVote").hide();
    $("#content").hide();

    // // Load account data
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    //Load election
    App.contracts.Factory.deployed()
      .then(function (instance) {
        const electionInstance = App.getContractInstance(address);
        electionInstance.electionState(function (err1, status) {
          if (!err1) {
            switch (status.c[0]) {
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
          }
        });
      })
      .catch(function (error) {
        console.warn(error);
      });

    App.contracts.Factory.deployed()
      .then(function (instance) {
        App.bindCandidateListEvents(address);
        App.bindVoteDoneEvents(address);
        App.bindJoinVoteEvents(address);
        App.bindWinnerEvents(address);
        App.bindControlEvents(address);
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  bindJoinVoteEvents: function (address) {
    $("#loader").show();
    $("#control #addCandidate").hide();
    $("#control #startVote").hide();
    $("#control #endVote").hide();
    $("#content").hide();

    const electionInstance = App.getContractInstance(address);
    electionInstance.voterRegister(App.account, function (err1, voter) {
      if (!err1) {
        if (voter[0]) {
          $("#joinVote").attr("disabled", true);
          $("#joinVote").text("Joined");
        } else if (App.state !== createdState) {
          $("#joinVote").attr("disabled", true);
          $("#joinVote").text("Can't join");
          $("#voteBtn").attr("disabled", true);
          $("#voteBtn").text("You didn't join this vote");
        }
      }
    });
  },

  bindCandidateListEvents: function (address) {
    $("#loader").show();
    $("#control #addCandidate").hide();
    $("#control #startVote").hide();
    $("#control #endVote").hide();
    $("#content").hide();

    const candidatesTable = $("#candidatesTable");
    const candidateOptions = $("#candidateOptions");
    const candidatesResults = $("#candidatesResults");
    candidatesResults.empty();

    const candidatesSelect = $("#candidatesSelect");
    candidatesSelect.empty();

    const electionInstance = App.getContractInstance(address);
    electionInstance.candidatesCount(function (err1, res) {
      if (!err1) {
        const candidatesCount = res.c[0];
        if (candidatesCount == 0) {
          candidatesTable.empty();
          candidatesTable.append(
            `<p class="text-center">Candidate list is empty<p>`
          );
          candidateOptions.hide();
        } else {
          for (let i = 1; i <= candidatesCount; i++) {
            electionInstance.candidates(i, function (err1, candidate) {
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
        console.log("candidatesResults :>> ", candidatesResults.val(0));
        $("#loader").hide();
        $("#control").show();
        $("#content").show();
      }
    });
  },

  bindVoteDoneEvents: function (address) {
    $("#loader").show();
    $("#control #addCandidate").hide();
    $("#control #startVote").hide();
    $("#control #endVote").hide();
    $("#content").hide();

    const electionInstance = App.getContractInstance(address);
    electionInstance.voterRegister(App.account, function (err1, voter) {
      if (!err1) {
        const voted = voter[2];
        if (voted) {
          $("#candidateOptions").hide();
          $("#voteBtn").attr("disabled", true);
          $("#voteBtn").text("Voted");
        }
        $("#loader").hide();
        $("#control #addCandidate").show();
        $("#control #startVote").show();
        $("#control #endVote").show();
        $("#content").show();
      }
    });
  },

  bindWinnerEvents: function (address) {
    const electionInstance = App.getContractInstance(address);
    electionInstance.finalWinner(function (err1, finalWinner) {
      if (!err1 && finalWinner) {
        $("#finalWinner").html(
          `<h4><strong>${finalWinner}</strong> is winner</h4><hr>`
        );
      }
    });
  },

  bindControlEvents: function (address) {
    const electionInstance = App.getContractInstance(address);
    electionInstance.electionOwnerAddress(function (
      err1,
      electionOwnerAddress
    ) {
      if (!err1) {
        if (electionOwnerAddress != App.account) {
          $("#control #addCandidate").hide();
          $("#control #startVote").hide();
          $("#control #endVote").hide();
        } else {
          $("#control #addCandidate").show();
          $("#control #startVote").show();
          $("#control #endVote").show();
        }
      }
    });
  },

  addElectionContract: function () {
    const electionName = $("#electionName").val();
    const electionDescription = $("#electionDescription").val();

    if (!electionName || !electionDescription) {
      $("#addElectionModalValidate").show();
      return;
    } else {
      App.contracts.Factory.deployed().then(function (instance) {
        return instance
          .addContract(electionName, electionDescription)
          .then(function (result) {
            if (result) {
              $("#addElectionModal").modal("hide");
              setInterval(() => {
                location.reload();
              }, 1000);
            }
          });
      });
    }
  },

  registerVoter: function () {
    const address = App.currContractAddress;
    const voterName = $("#voterName").val();
    App.contracts.Factory.deployed().then(function (instance) {
      const electionInstance = App.getContractInstance(address);
      electionInstance.joinVote(App.account, voterName, function (
        err1,
        result
      ) {
        if (!err1) {
          setInterval(() => {
            location.reload();
          }, 1000);
        }
      });
    });
  },

  startVote: function () {
    const address = App.currContractAddress;
    App.contracts.Factory.deployed().then(function (instance) {
      const electionInstance = App.getContractInstance(address);
      electionInstance.startVote(function (err1, result) {
        if (!err1) {
          setInterval(() => {
            location.reload();
          }, 1000);
        }
      });
    });
  },

  endVote: function () {
    const address = App.currContractAddress;
    App.contracts.Factory.deployed().then(function (instance) {
      const electionInstance = App.getContractInstance(address);
      electionInstance.endVote(function (err1, result) {
        if (!err1) {
          setInterval(() => {
            location.reload();
          }, 1000);
        }
      });
    });
  },

  handleVote: function (event) {
    event.preventDefault();

    const address = App.currContractAddress;
    const candidateId = $("#candidatesSelect").val();
    App.contracts.Factory.deployed().then(function (instance) {
      const electionInstance = App.getContractInstance(address);
      electionInstance.doVote(candidateId, { from: App.account }, function (
        err1,
        result
      ) {
        if (!err1) {
          setInterval(() => {
            location.reload();
          }, 1000);
        }
      });
    });
  },

  addCandidate: function () {
    const address = App.currContractAddress;
    const candidateName = $("#candidateName").val();
    App.contracts.Factory.deployed().then(function (instance) {
      const electionInstance = App.getContractInstance(address);
      electionInstance.addCandidate(candidateName, function (err1, result) {
        if (!err1) {
          $("#addCandidateModal").modal("hide");
          setInterval(() => {
            location.reload();
          }, 1000);
        }
      });
    });
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
  window.ethereum.on("accountsChanged", function (accounts) {
    location.reload();
    // Time to reload your interface with accounts[0]!
  });
});
